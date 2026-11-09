ALTER TABLE `Order`
    ADD COLUMN `shippingAddress` VARCHAR(255) NULL,
    ADD COLUMN `shippingCityCode` VARCHAR(10) NULL,
    ADD COLUMN `shippingCityName` VARCHAR(100) NULL,
    ADD COLUMN `shippingDistanceKm` DECIMAL(8,2) NULL,
    ADD COLUMN `shippingZone` VARCHAR(20) NULL;
