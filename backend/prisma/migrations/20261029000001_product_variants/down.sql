-- Restore the single-weight columns on Product.
ALTER TABLE `Product` ADD COLUMN `weight` VARCHAR(20) NULL;
ALTER TABLE `Product` ADD COLUMN `price` DECIMAL(10, 2) NULL;
ALTER TABLE `Product` ADD COLUMN `stock` INTEGER NULL;

UPDATE `Product` p
JOIN (
    SELECT pv.`productId`, pv.`weight`, pv.`price`, pv.`stock`
    FROM `ProductVariant` pv
    JOIN (
        SELECT `productId`, MIN(`id`) AS `firstId`
        FROM `ProductVariant`
        GROUP BY `productId`
    ) firstVariant ON firstVariant.`firstId` = pv.`id`
) source ON source.`productId` = p.`id`
SET p.`weight` = source.`weight`,
    p.`price` = source.`price`,
    p.`stock` = source.`stock`;

ALTER TABLE `Product` MODIFY COLUMN `weight` VARCHAR(20) NOT NULL;
ALTER TABLE `Product` MODIFY COLUMN `price` DECIMAL(10, 2) NOT NULL;
ALTER TABLE `Product` MODIFY COLUMN `stock` INTEGER NOT NULL;

-- Remove order item variant snapshot.
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_variantId_fkey`;
ALTER TABLE `OrderItem` DROP INDEX `OrderItem_variantId_idx`;
ALTER TABLE `OrderItem` DROP COLUMN `variantWeight`;
ALTER TABLE `OrderItem` DROP COLUMN `variantId`;
ALTER TABLE `OrderItem` DROP INDEX `OrderItem_orderId_productId_idx`;
ALTER TABLE `OrderItem` ADD INDEX `OrderItem.orderId_productId_idx`(`orderId`, `productId`);

-- Remove cart item variant reference.
ALTER TABLE `CartItem` DROP FOREIGN KEY `CartItem_variantId_fkey`;
ALTER TABLE `CartItem` DROP INDEX `CartItem_variantId_idx`;
ALTER TABLE `CartItem` DROP INDEX `CartItem_cartId_variantId_key`;
ALTER TABLE `CartItem` DROP COLUMN `variantId`;
ALTER TABLE `CartItem` DROP INDEX `CartItem_cartId_productId_idx`;
ALTER TABLE `CartItem` ADD INDEX `CartItem.cartId_productId_idx`(`cartId`, `productId`);

ALTER TABLE `ProductVariant` DROP FOREIGN KEY `ProductVariant_productId_fkey`;
DROP TABLE `ProductVariant`;
