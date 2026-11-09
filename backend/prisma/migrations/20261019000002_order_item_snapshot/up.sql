-- AddColumn (nullable first so existing rows can be backfilled without data loss)
ALTER TABLE `OrderItem` ADD COLUMN `productName` VARCHAR(191) NULL;

-- Backfill existing rows from the related product, keeping order history readable
UPDATE `OrderItem` oi
JOIN `Product` p ON p.`id` = oi.`productId`
SET oi.`productName` = p.`name`
WHERE oi.`productName` IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE `OrderItem` MODIFY COLUMN `productName` VARCHAR(191) NOT NULL;
