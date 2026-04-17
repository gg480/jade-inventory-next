/**
 * Database Auto-Initialization
 *
 * Called when the Next.js app starts. Checks if the database has been
 * initialized and, if not, creates the schema and seeds initial data.
 *
 * Uses better-sqlite3 for DDL (table creation) because Prisma's
 * $executeRawUnsafe doesn't reliably create tables in SQLite.
 * After tables exist, Prisma is used for data seeding.
 */

import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

let initialized = false;

export async function ensureDbInitialized(): Promise<void> {
  if (initialized) return;

  try {
    // Resolve database file path from DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db';
    let dbPath: string;

    if (dbUrl.startsWith('file:')) {
      dbPath = dbUrl.slice(5);
      // Handle relative paths — resolve from process.cwd()
      if (!path.isAbsolute(dbPath)) {
        dbPath = path.resolve(process.cwd(), dbPath);
      }
    } else {
      dbPath = dbUrl;
    }

    console.log(`📦 Database path: ${dbPath}`);

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Check if database already has data
    const dbExists = fs.existsSync(dbPath);
    let needsInit = true;

    if (dbExists) {
      try {
        const Database = require('better-sqlite3');
        const sqlite = new Database(dbPath, { readonly: true });
        const row = sqlite.prepare('SELECT COUNT(*) as count FROM sys_config').get() as any;
        sqlite.close();
        if (row && row.count > 0) {
          needsInit = false;
          console.log('✅ Database already initialized');
        }
      } catch {
        // Table doesn't exist or DB is empty
        needsInit = true;
      }
    }

    if (!needsInit) {
      initialized = true;
      return;
    }

    console.log('📦 Initializing database...');

    // Use better-sqlite3 to create tables (much more reliable than Prisma DDL)
    const Database = require('better-sqlite3');
    const sqlite = new Database(dbPath);

    // Enable WAL mode for better performance
    sqlite.pragma('journal_mode = WAL');

    // Create all tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sys_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS dict_material (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT,
        sub_type TEXT,
        origin TEXT,
        cost_per_gram REAL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS dict_type (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        spec_fields TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS dict_tag (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        group_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        phone TEXT,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS customers (
        customer_code TEXT NOT NULL UNIQUE,
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        wechat TEXT,
        address TEXT,
        notes TEXT,
        tags TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_code TEXT NOT NULL UNIQUE,
        material_id INTEGER NOT NULL,
        type_id INTEGER,
        quantity INTEGER NOT NULL,
        total_cost REAL NOT NULL,
        cost_alloc_method TEXT NOT NULL,
        supplier_id INTEGER,
        purchase_date TEXT,
        notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES dict_material(id),
        FOREIGN KEY (type_id) REFERENCES dict_type(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku_code TEXT NOT NULL UNIQUE,
        name TEXT,
        batch_code TEXT,
        batch_id INTEGER,
        material_id INTEGER NOT NULL,
        type_id INTEGER,
        cost_price REAL,
        allocated_cost REAL,
        selling_price REAL NOT NULL,
        floor_price REAL,
        origin TEXT,
        counter INTEGER,
        cert_no TEXT,
        notes TEXT,
        supplier_id INTEGER,
        status TEXT NOT NULL DEFAULT 'in_stock',
        purchase_date TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (material_id) REFERENCES dict_material(id),
        FOREIGN KEY (type_id) REFERENCES dict_type(id),
        FOREIGN KEY (batch_id) REFERENCES batches(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS item_tag (
        item_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (item_id, tag_id),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES dict_tag(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS item_spec (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL UNIQUE,
        weight REAL,
        metal_weight REAL,
        size TEXT,
        bracelet_size TEXT,
        bead_count INTEGER,
        bead_diameter TEXT,
        ring_size TEXT,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS item_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        thumbnail_path TEXT,
        is_cover BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS bundle_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bundle_no TEXT NOT NULL UNIQUE,
        total_price REAL NOT NULL,
        alloc_method TEXT NOT NULL,
        sale_date TEXT NOT NULL,
        channel TEXT NOT NULL,
        customer_id INTEGER,
        note TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS sale_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_no TEXT NOT NULL UNIQUE,
        item_id INTEGER NOT NULL,
        actual_price REAL NOT NULL,
        channel TEXT NOT NULL,
        sale_date TEXT NOT NULL,
        customer_id INTEGER,
        bundle_id INTEGER,
        note TEXT,
        payment_method TEXT,
        payment_status TEXT NOT NULL DEFAULT 'paid',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (bundle_id) REFERENCES bundle_sales(id)
      );

      CREATE TABLE IF NOT EXISTS metal_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        price_per_gram REAL NOT NULL,
        effective_date TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES dict_material(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        must_change_pwd BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sale_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        refund_amount REAL NOT NULL,
        return_reason TEXT NOT NULL,
        return_date TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sale_records(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      );

      CREATE TABLE IF NOT EXISTS operation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        detail TEXT,
        operator TEXT NOT NULL DEFAULT 'admin',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL DEFAULT 'admin',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
      CREATE INDEX IF NOT EXISTS idx_items_material ON items(material_id);
      CREATE INDEX IF NOT EXISTS idx_items_batch ON items(batch_id);
      CREATE INDEX IF NOT EXISTS idx_sale_date ON sale_records(sale_date);
      CREATE INDEX IF NOT EXISTS idx_sale_channel ON sale_records(channel);
      CREATE INDEX IF NOT EXISTS idx_sale_payment ON sale_records(payment_status);
      CREATE INDEX IF NOT EXISTS idx_log_action ON operation_log(action);
      CREATE INDEX IF NOT EXISTS idx_log_target ON operation_log(target_type);
      CREATE INDEX IF NOT EXISTS idx_log_time ON operation_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
      CREATE INDEX IF NOT EXISTS idx_session_expires ON session(expires_at);
    `);

    console.log('✅ Database tables created');

    // Seed initial data using better-sqlite3 (no Prisma dependency)
    console.log('🌱 Seeding initial data...');

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const { salt, hash } = hashPassword(adminPassword);
    const passwordHash = `${salt}:${hash}`;

    const insertConfig = sqlite.prepare(
      'INSERT OR REPLACE INTO sys_config (key, value, description) VALUES (?, ?, ?)'
    );

    insertConfig.run('admin_password', passwordHash, '管理员密码(哈希)');
    insertConfig.run('operating_cost_rate', '0.05', '经营成本率');
    insertConfig.run('markup_rate', '0.30', '零售价上浮比例');
    insertConfig.run('aging_threshold_days', '90', '压货预警天数(旧)');
    insertConfig.run('warning_days', '90', '压货预警天数');
    insertConfig.run('default_alloc_method', 'equal', '默认分摊算法');
    console.log(`✅ System config inserted (6 items), password = "${adminPassword.substring(0, 3)}***"`);

    // Materials (36)
    const insertMaterial = sqlite.prepare(
      'INSERT OR IGNORE INTO dict_material (name, category, sub_type, origin, cost_per_gram, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const materials = [
      ['黄金', '贵金属', 'k999', null, null, 1],
      ['银', '贵金属', '990', null, 25, 2],
      ['k铂金', '贵金属', null, null, null, 3],
      ['铂金', '贵金属', null, null, null, 4],
      ['18K金', '贵金属', null, null, 780, 5],
      ['翡翠', '玉', null, '缅甸', null, 6],
      ['和田玉', '玉', null, null, null, 7],
      ['珍珠', '其他', '淡水珠', '浙江', null, 8],
      ['朱砂', '文玩', null, null, null, 9],
      ['蜜蜡', '文玩', null, null, null, 10],
      ['碧玺', '水晶', null, null, null, 11],
      ['青金石', '水晶', null, null, null, 12],
      ['黑曜石', '水晶', null, null, null, 13],
      ['金曜石', '水晶', null, null, null, 14],
      ['玛瑙', '水晶', null, null, null, 15],
      ['琥珀', '文玩', null, null, null, 16],
      ['锆石', '其他', null, '梧州', null, 17],
      ['斑彩螺', '其他', null, '意大利', null, 18],
      ['金虎眼', '水晶', null, null, null, 19],
      ['虎眼', '水晶', null, null, null, 20],
      ['粉晶', '水晶', null, null, null, 21],
      ['紫水晶', '水晶', null, null, null, 22],
      ['莹石', '水晶', null, null, null, 23],
      ['绿幽灵', '水晶', null, null, null, 24],
      ['白幽灵', '水晶', null, null, null, 25],
      ['彩幽灵', '水晶', null, null, null, 26],
      ['金发晶', '水晶', null, null, null, 27],
      ['钛晶', '水晶', null, null, null, 28],
      ['巴西黄水晶', '水晶', null, null, null, 29],
      ['人工黄水晶', '水晶', null, null, null, 30],
      ['红幽灵', '水晶', null, null, null, 31],
      ['蓝晶石', '水晶', null, null, null, 32],
      ['海蓝宝', '水晶', null, null, null, 33],
      ['天河石', '水晶', null, null, null, 34],
      ['红绿宝石共生', '水晶', null, null, null, 35],
      ['车花透辉石', '水晶', null, null, null, 36],
    ];
    const insertManyMaterials = sqlite.transaction((items: any[][]) => {
      for (const item of items) insertMaterial.run(...item);
    });
    insertManyMaterials(materials);
    console.log('✅ Materials inserted (36)');

    // Types (9)
    const insertType = sqlite.prepare(
      'INSERT OR IGNORE INTO dict_type (name, spec_fields, sort_order) VALUES (?, ?, ?)'
    );
    const types = [
      ['手镯', '{"weight":{"required":false},"braceletSize":{"required":true}}', 1],
      ['挂件', '{"weight":{"required":false}}', 2],
      ['吊坠', '{"weight":{"required":false}}', 3],
      ['手串/手链', '{"weight":{"required":false},"beadCount":{"required":false},"beadDiameter":{"required":true}}', 4],
      ['项链', '{"weight":{"required":false},"beadDiameter":{"required":true}}', 5],
      ['脚链', '{"weight":{"required":false},"beadCount":{"required":false},"beadDiameter":{"required":false}}', 6],
      ['戒指', '{"weight":{"required":false},"metalWeight":{"required":false},"ringSize":{"required":true}}', 7],
      ['耳饰', '{"weight":{"required":false}}', 8],
      ['摆件', '{"weight":{"required":false},"size":{"required":false}}', 9],
    ];
    const insertManyTypes = sqlite.transaction((items: any[][]) => {
      for (const item of items) insertType.run(...item);
    });
    insertManyTypes(types);
    console.log('✅ Types inserted (9)');

    // Tags (20)
    const insertTag = sqlite.prepare(
      'INSERT OR IGNORE INTO dict_tag (name, group_name) VALUES (?, ?)'
    );
    const tags = [
      ['玻璃种', '种水'], ['冰种', '种水'], ['糯冰种', '种水'], ['糯种', '种水'], ['豆种', '种水'],
      ['满绿', '颜色'], ['飘花', '颜色'], ['紫罗兰', '颜色'], ['黄翡', '颜色'], ['墨翠', '颜色'],
      ['无色', '颜色'], ['手工雕', '工艺'], ['机雕', '工艺'], ['素面', '工艺'],
      ['观音', '题材'], ['佛公', '题材'], ['平安扣', '题材'], ['如意', '题材'], ['山水', '题材'], ['花鸟', '题材'],
    ];
    const insertManyTags = sqlite.transaction((items: any[][]) => {
      for (const item of items) insertTag.run(...item);
    });
    insertManyTags(tags);
    console.log('✅ Tags inserted (20)');

    // Metal prices
    const today = new Date().toISOString().split('T')[0];
    const silverRow = sqlite.prepare("SELECT id FROM dict_material WHERE name = '银'").get() as any;
    const gold18kRow = sqlite.prepare("SELECT id FROM dict_material WHERE name = '18K金'").get() as any;
    const insertMetalPrice = sqlite.prepare(
      'INSERT INTO metal_prices (material_id, price_per_gram, effective_date) VALUES (?, ?, ?)'
    );
    if (silverRow) insertMetalPrice.run(silverRow.id, 25, today);
    if (gold18kRow) insertMetalPrice.run(gold18kRow.id, 780, today);
    console.log('✅ Metal prices inserted');

    sqlite.close();
    console.log('🎉 Database initialization complete!');
    initialized = true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't throw — let the app try to start anyway
  }
}
