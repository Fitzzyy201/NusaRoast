-- Rename role SELLER -> ADMIN (3 steps to stay safe under MySQL strict mode).
ALTER TABLE `User` MODIFY `role` ENUM('BUYER', 'SELLER', 'ADMIN') NOT NULL DEFAULT 'BUYER';

UPDATE `User` SET `role` = 'ADMIN' WHERE `role` = 'SELLER';

ALTER TABLE `User` MODIFY `role` ENUM('BUYER', 'ADMIN') NOT NULL DEFAULT 'BUYER';
