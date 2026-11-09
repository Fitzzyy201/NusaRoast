-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `weight` VARCHAR(20) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductVariant_productId_weight_key`(`productId`, `weight`),
    INDEX `ProductVariant_productId_sortOrder_idx`(`productId`, `sortOrder`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one default variant for every existing product before dropping the old columns.
INSERT INTO `ProductVariant` (`productId`, `weight`, `price`, `stock`, `sortOrder`)
SELECT `id`, `weight`, `price`, `stock`, 0
FROM `Product`;

-- Add variant reference to cart items.
ALTER TABLE `CartItem` ADD COLUMN `variantId` INTEGER NULL;

UPDATE `CartItem` ci
JOIN `ProductVariant` pv ON pv.`productId` = ci.`productId`
SET ci.`variantId` = pv.`id`
WHERE ci.`variantId` IS NULL;

-- Merge any duplicate cart rows created before the unique constraint existed.
UPDATE `CartItem` ci
JOIN (
    SELECT `cartId`, `variantId`, MIN(`id`) AS `keepId`, SUM(`quantity`) AS `totalQuantity`
    FROM `CartItem`
    GROUP BY `cartId`, `variantId`
    HAVING COUNT(*) > 1
) duplicates ON duplicates.`keepId` = ci.`id`
SET ci.`quantity` = duplicates.`totalQuantity`;

DELETE ci
FROM `CartItem` ci
JOIN (
    SELECT `cartId`, `variantId`, MIN(`id`) AS `keepId`
    FROM `CartItem`
    GROUP BY `cartId`, `variantId`
    HAVING COUNT(*) > 1
) duplicates
    ON duplicates.`cartId` = ci.`cartId`
    AND duplicates.`variantId` = ci.`variantId`
    AND duplicates.`keepId` <> ci.`id`;

ALTER TABLE `CartItem` MODIFY COLUMN `variantId` INTEGER NOT NULL;
ALTER TABLE `CartItem` ADD UNIQUE INDEX `CartItem_cartId_variantId_key`(`cartId`, `variantId`);
ALTER TABLE `CartItem` ADD INDEX `CartItem_variantId_idx`(`variantId`);
ALTER TABLE `CartItem` DROP INDEX `CartItem.cartId_productId_idx`;
ALTER TABLE `CartItem` ADD INDEX `CartItem_cartId_productId_idx`(`cartId`, `productId`);
ALTER TABLE `CartItem` ADD CONSTRAINT `CartItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add immutable variant snapshots to order items.
ALTER TABLE `OrderItem` ADD COLUMN `variantId` INTEGER NULL;
ALTER TABLE `OrderItem` ADD COLUMN `variantWeight` VARCHAR(20) NULL;

UPDATE `OrderItem` oi
JOIN `ProductVariant` pv ON pv.`productId` = oi.`productId`
SET oi.`variantId` = pv.`id`, oi.`variantWeight` = pv.`weight`
WHERE oi.`variantId` IS NULL OR oi.`variantWeight` IS NULL;

ALTER TABLE `OrderItem` MODIFY COLUMN `variantId` INTEGER NOT NULL;
ALTER TABLE `OrderItem` MODIFY COLUMN `variantWeight` VARCHAR(20) NOT NULL;
ALTER TABLE `OrderItem` ADD INDEX `OrderItem_variantId_idx`(`variantId`);
ALTER TABLE `OrderItem` DROP INDEX `OrderItem.orderId_productId_idx`;
ALTER TABLE `OrderItem` ADD INDEX `OrderItem_orderId_productId_idx`(`orderId`, `productId`);
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove the single-weight columns from Product.
ALTER TABLE `Product` DROP COLUMN `weight`, DROP COLUMN `price`, DROP COLUMN `stock`;
