import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {test} from 'node:test';
const server=readFileSync(new URL('../src/server.mjs',import.meta.url),'utf8');
const seller=readFileSync(new URL('../src/seller-wallet.mjs',import.meta.url),'utf8');
const migration=readFileSync(new URL('../migrations/010_seller_upgrade.sql',import.meta.url),'utf8');
test('seller directory exposes real database-backed enabled sellers',()=>{
 assert.match(server,/GET' && url.pathname === '\/api\/v1\/sellers'/);
 assert.match(server,/FROM akira_seller_wallets s JOIN akira_users u/);
 assert.match(server,/WHERE s.enabled=true/);
});
test('seller transfer is transactional and credits original wallet',()=>{
 assert.match(seller,/await db.query\('BEGIN'\)/);
 assert.match(seller,/UPDATE akira_seller_wallets SET balance/);
 assert.match(seller,/UPDATE akira_wallets SET balance/);
 assert.match(seller,/INSERT INTO akira_wallet_transactions/);
 assert.match(seller,/await db.query\('COMMIT'\)/);
 assert.match(seller,/await db.query\('ROLLBACK'\)/);
});
test('seller migration is additive and keeps prior balances',()=>{
 assert.match(migration,/ADD COLUMN IF NOT EXISTS enabled/);
 assert.match(migration,/CREATE TABLE IF NOT EXISTS akira_seller_transfers/);
 assert.doesNotMatch(migration,/DROP TABLE|TRUNCATE|DELETE FROM|UPDATE akira_seller_wallets SET balance/i);
});
