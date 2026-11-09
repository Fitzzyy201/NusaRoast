-- Down migration (rollback)
ALTER TABLE `OrderItem` DROP COLUMN `productName`;
