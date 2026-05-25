const fs = require('fs');
const file = 'prisma/schema.prisma';
let content = fs.readFileSync(file, 'utf8');

// Update ItAsset
const oldAsset = `  purchaseDate       DateTime?\r\n  warrantyExpiration DateTime?\r
\r
  employeeId String?\r\n  employee   Employee? @relation(fields: [employeeId], references: [id])\r
\r
  createdAt DateTime @default(now())\r\n  updatedAt DateTime @updatedAt\r\n}`;

const oldAssetUnix = oldAsset.replace(/\r/g, '');

const newAsset = `  purchaseDate       DateTime?
  warrantyExpiration DateTime?
  lastMaintenance    DateTime?

  employeeId String?
  employee   Employee? @relation(fields: [employeeId], references: [id])

  history    ItAssetHistory[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ItAssetHistory {
  id          String   @id @default(cuid())
  assetId     String
  asset       ItAsset  @relation(fields: [assetId], references: [id], onDelete: Cascade)
  action      String   // "Criado", "Atribuído", "Devolvido ao Estoque", "Enviado para Manutenção", etc
  employeeId  String?
  employee    Employee? @relation(fields: [employeeId], references: [id])
  notes       String?
  
  createdAt   DateTime @default(now())
}`;

if (content.includes(oldAsset)) {
    content = content.replace(oldAsset, newAsset);
} else if (content.includes(oldAssetUnix)) {
    content = content.replace(oldAssetUnix, newAsset);
} else {
    console.error("Could not find ItAsset definition");
}

// Update Employee
const oldEmployee = `  itAssets    ItAsset[]\r
\r
  createdAt DateTime @default(now())\r\n  updatedAt DateTime @updatedAt\r\n}`;
const oldEmployeeUnix = oldEmployee.replace(/\r/g, '');

const newEmployee = `  itAssets    ItAsset[]
  itAssetHistories ItAssetHistory[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;

if (content.includes(oldEmployee)) {
    content = content.replace(oldEmployee, newEmployee);
} else if (content.includes(oldEmployeeUnix)) {
    content = content.replace(oldEmployeeUnix, newEmployee);
} else {
    console.error("Could not find Employee definition");
}

fs.writeFileSync(file, content);
console.log('Schema updated successfully');
