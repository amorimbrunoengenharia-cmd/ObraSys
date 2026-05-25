$headers = @{
    Cookie = 'userRole=Diretor; userEmail=bruno@wayservice.com'
    'RSC' = '1'
    'Next-Router-State-Tree' = '%5B%22%22%2C%7B%22children%22%3A%5B%22rh%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D'
}

Write-Host "=== Testando RH (RSC payload) ==="
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000/rh' -UseBasicParsing -Headers $headers
    $body = $r.Content
    $len = $body.Length
    Write-Host "RH RSC: $len bytes"
    if ($body -like '*Carlos*') { Write-Host 'OK: Carlos encontrado' } else { Write-Host 'WARN: Carlos nao encontrado no RSC' }
    if ($body -like '*Pedreiro*') { Write-Host 'OK: Pedreiro encontrado' } else { Write-Host 'WARN: Pedreiro nao encontrado no RSC' }
    if ($body -like '*Efetivo*') { Write-Host 'OK: Efetivo encontrado' } else { Write-Host 'WARN: Efetivo nao encontrado no RSC' }
    # Salvar para inspeção
    $body.Substring(0, [Math]::Min(2000, $body.Length)) | Out-File -Encoding utf8 scratch/rh_rsc_sample.txt
    Write-Host "Amostra salva em scratch/rh_rsc_sample.txt"
} catch {
    Write-Host "Erro: $_"
}

Write-Host "`n=== Testando TI (RSC payload) ==="
$headers2 = @{
    Cookie = 'userRole=Diretor; userEmail=bruno@wayservice.com'
    'RSC' = '1'
}
try {
    $r2 = Invoke-WebRequest -Uri 'http://localhost:3000/ti' -UseBasicParsing -Headers $headers2
    $body2 = $r2.Content
    $len2 = $body2.Length
    Write-Host "TI RSC: $len2 bytes"
    if ($body2 -like '*LAP*') { Write-Host 'OK: LAP encontrado' } else { Write-Host 'WARN: LAP nao encontrado no RSC' }
    if ($body2 -like '*Dell*') { Write-Host 'OK: Dell encontrado' } else { Write-Host 'WARN: Dell nao encontrado no RSC' }
    if ($body2 -like '*Notebook*') { Write-Host 'OK: Notebook encontrado' } else { Write-Host 'WARN: Notebook nao encontrado no RSC' }
    $body2.Substring(0, [Math]::Min(2000, $body2.Length)) | Out-File -Encoding utf8 scratch/ti_rsc_sample.txt
    Write-Host "Amostra salva em scratch/ti_rsc_sample.txt"
} catch {
    Write-Host "Erro: $_"
}
