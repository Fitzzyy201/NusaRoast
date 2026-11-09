-- Down migration (rollback)
DROP INDEX IF EXISTS "User.email_unique";
DROP INDEX IF EXISTS "Cart.userId_idx";
DROP INDEX IF EXISTS "CartItem.cartId_productId_idx";
DROP INDEX IF EXISTS "Order.userId_idx";
DROP INDEX IF EXISTS "OrderItem.orderId_productId_idx";
DROP INDEX IF EXISTS "OrderStatusLog.orderId_idx";

DROP TABLE IF EXISTS "OrderStatusLog";
DROP TABLE IF EXISTS "OrderItem";
DROP TABLE IF EXISTS "Order";
DROP TABLE IF EXISTS "CartItem";
DROP TABLE IF EXISTS "Cart";
DROP TABLE IF EXISTS "Product";
DROP TABLE IF EXISTS "User";