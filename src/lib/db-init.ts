/**
 * Database Auto-Initialization
 *
 * Called when the Next.js app starts. Checks if the database has been
 * initialized and, if not, creates the schema and seeds initial data.
 *
 * This is the RELIABLE way to initialize the DB in Docker — no dependency
 * on npx, bun, or prisma CLI being available in the container.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

let initialized = false;

export async function ensureDbInitialized(): Promise<void> {
  if (initialized) return;

  try {
    const prisma = new PrismaClient();

    // Quick check: does the SysConfig table exist and have data?
    let needsInit = false;
    try {
      const count = await prisma.sysConfig.count();
      if (count === 0) {
        needsInit = true;
      }
    } catch {
      // Table doesn't exist yet — DB schema needs to be created
      needsInit = true;
    }

    if (!needsInit) {
      initialized = true;
      await prisma.$disconnect();
      return;
    }

    console.log('📦 Database not initialized. Running auto-init...');

    // Step 1: Push schema using Prisma Client's raw query approach
    // Since we can't run `prisma db push` in standalone mode,
    // we use Prisma's internal $executeRaw to create tables.
    // But actually, Prisma will auto-create tables on first query if we use
    // the right approach. Let's try a different method.

    // The most reliable approach: use prisma.$executeRawUnsafe to create
    // all tables directly via SQL.

    console.log('📋 Creating database tables...');
    const createTableSQLs = [
      `CREATE TABLE IF NOT EXISTS sys_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS dict_material (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT,
        sub_type TEXT,
        origin TEXT,
        cost_per_gram REAL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS dict_type (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        spec_fields TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS dict_tag (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        group_name TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact TEXT,
        phone TEXT,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
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
      )`,
      `CREATE TABLE IF NOT EXISTS batches (
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
      )`,
      `CREATE TABLE IF NOT EXISTS items (
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
      )`,
      `CREATE TABLE IF NOT EXISTS item_tag (
        item_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (item_id, tag_id),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES dict_tag(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS item_spec (
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
      )`,
      `CREATE TABLE IF NOT EXISTS item_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        thumbnail_path TEXT,
        is_cover BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sale_records (
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
      )`,
      `CREATE TABLE IF NOT EXISTS bundle_sales (
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
      )`,
      `CREATE TABLE IF NOT EXISTS metal_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        price_per_gram REAL NOT NULL,
        effective_date TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES dict_material(id)
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        must_change_pwd BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sale_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        refund_amount REAL NOT NULL,
        return_reason TEXT NOT NULL,
        return_date TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sale_records(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )`,
      `CREATE TABLE IF NOT EXISTS operation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        detail TEXT,
        operator TEXT NOT NULL DEFAULT 'admin',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL DEFAULT 'admin',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL
      )`,
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`,
      `CREATE INDEX IF NOT EXISTS idx_items_material ON items(material_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_batch ON items(batch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sale_date ON sale_records(sale_date)`,
      `CREATE INDEX IF NOT EXISTS idx_sale_channel ON sale_records(channel)`,
      `CREATE INDEX IF NOT EXISTS idx_sale_payment ON sale_records(payment_status)`,
      `CREATE INDEX IF NOT EXISTS idx_log_action ON operation_log(action)`,
      `CREATE INDEX IF NOT EXISTS idx_log_target ON operation_log(target_type)`,
      `CREATE INDEX IF NOT EXISTS idx_log_time ON operation_log(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_session_token ON session(token)`,
      `CREATE INDEX IF NOT EXISTS idx_session_expires ON session(expires_at)`,
    ];

    for (const sql of createTableSQLs) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        // "already exists" errors are OK
        if (!e.message?.includes('already exists')) {
          console.error('SQL error:', e.message);
        }
      }
    }
    console.log('✅ Database tables created');

    // Step 2: Seed initial data
    console.log('🌱 Seeding initial data...');

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const { salt, hash } = hashPassword(adminPassword);

    // System config
    const configs = [
      { key: 'admin_password', value: `${salt}:${hash}`, description: '管理员密码(哈希)' },
      { key: 'operating_cost_rate', value: '0.05', description: '经营成本率' },
      { key: 'markup_rate', value: '0.30', description: '零售价上浮比例' },
      { key: 'aging_threshold_days', value: '90', description: '压货预警天数(旧)' },
      { key: 'warning_days', value: '90', description: '压货预警天数' },
      { key: 'default_alloc_method', value: 'equal', description: '默认分摊算法' },
    ];

    for (const c of configs) {
      await prisma.sysConfig.upsert({
        where: { key: c.key },
        update: { value: c.value, description: c.description },
        create: c,
      });
    }
    console.log(`✅ System config inserted (${configs.length} items), password = "${adminPassword.substring(0, 3)}***"`);

    // Materials (36)
    const materials = [
      { name: '黄金', category: '贵金属', subType: 'k999', sortOrder: 1 },
      { name: '银', category: '贵金属', subType: '990', costPerGram: 25, sortOrder: 2 },
      { name: 'k铂金', category: '贵金属', sortOrder: 3 },
      { name: '铂金', category: '贵金属', sortOrder: 4 },
      { name: '18K金', category: '贵金属', costPerGram: 780, sortOrder: 5 },
      { name: '翡翠', category: '玉', origin: '缅甸', sortOrder: 6 },
      { name: '和田玉', category: '玉', sortOrder: 7 },
      { name: '珍珠', category: '其他', subType: '淡水珠', origin: '浙江', sortOrder: 8 },
      { name: '朱砂', category: '文玩', sortOrder: 9 },
      { name: '蜜蜡', category: '文玩', sortOrder: 10 },
      { name: '碧玺', category: '水晶', sortOrder: 11 },
      { name: '青金石', category: '水晶', sortOrder: 12 },
      { name: '黑曜石', category: '水晶', sortOrder: 13 },
      { name: '金曜石', category: '水晶', sortOrder: 14 },
      { name: '玛瑙', category: '水晶', sortOrder: 15 },
      { name: '琥珀', category: '文玩', sortOrder: 16 },
      { name: '锆石', category: '其他', origin: '梧州', sortOrder: 17 },
      { name: '斑彩螺', category: '其他', origin: '意大利', sortOrder: 18 },
      { name: '金虎眼', category: '水晶', sortOrder: 19 },
      { name: '虎眼', category: '水晶', sortOrder: 20 },
      { name: '粉晶', category: '水晶', sortOrder: 21 },
      { name: '紫水晶', category: '水晶', sortOrder: 22 },
      { name: '莹石', category: '水晶', sortOrder: 23 },
      { name: '绿幽灵', category: '水晶', sortOrder: 24 },
      { name: '白幽灵', category: '水晶', sortOrder: 25 },
      { name: '彩幽灵', category: '水晶', sortOrder: 26 },
      { name: '金发晶', category: '水晶', sortOrder: 27 },
      { name: '钛晶', category: '水晶', sortOrder: 28 },
      { name: '巴西黄水晶', category: '水晶', sortOrder: 29 },
      { name: '人工黄水晶', category: '水晶', sortOrder: 30 },
      { name: '红幽灵', category: '水晶', sortOrder: 31 },
      { name: '蓝晶石', category: '水晶', sortOrder: 32 },
      { name: '海蓝宝', category: '水晶', sortOrder: 33 },
      { name: '天河石', category: '水晶', sortOrder: 34 },
      { name: '红绿宝石共生', category: '水晶', sortOrder: 35 },
      { name: '车花透辉石', category: '水晶', sortOrder: 36 },
    ];
    for (const m of materials) {
      await prisma.dictMaterial.upsert({
        where: { name: m.name },
        update: { category: m.category },
        create: {
          name: m.name,
          category: m.category,
          subType: m.subType,
          origin: m.origin,
          costPerGram: m.costPerGram,
          sortOrder: m.sortOrder,
        },
      });
    }
    console.log('✅ Materials inserted (36)');

    // Types (9)
    const types = [
      { name: '手镯', specFields: '{"weight":{"required":false},"braceletSize":{"required":true}}', sortOrder: 1 },
      { name: '挂件', specFields: '{"weight":{"required":false}}', sortOrder: 2 },
      { name: '吊坠', specFields: '{"weight":{"required":false}}', sortOrder: 3 },
      { name: '手串/手链', specFields: '{"weight":{"required":false},"beadCount":{"required":false},"beadDiameter":{"required":true}}', sortOrder: 4 },
      { name: '项链', specFields: '{"weight":{"required":false},"beadDiameter":{"required":true}}', sortOrder: 5 },
      { name: '脚链', specFields: '{"weight":{"required":false},"beadCount":{"required":false},"beadDiameter":{"required":false}}', sortOrder: 6 },
      { name: '戒指', specFields: '{"weight":{"required":false},"metalWeight":{"required":false},"ringSize":{"required":true}}', sortOrder: 7 },
      { name: '耳饰', specFields: '{"weight":{"required":false}}', sortOrder: 8 },
      { name: '摆件', specFields: '{"weight":{"required":false},"size":{"required":false}}', sortOrder: 9 },
    ];
    for (const t of types) {
      await prisma.dictType.upsert({
        where: { name: t.name },
        update: { specFields: t.specFields },
        create: { name: t.name, specFields: t.specFields, sortOrder: t.sortOrder },
      });
    }
    console.log('✅ Types inserted (9)');

    // Tags (20)
    const tags = [
      { name: '玻璃种', groupName: '种水' }, { name: '冰种', groupName: '种水' },
      { name: '糯冰种', groupName: '种水' }, { name: '糯种', groupName: '种水' },
      { name: '豆种', groupName: '种水' }, { name: '满绿', groupName: '颜色' },
      { name: '飘花', groupName: '颜色' }, { name: '紫罗兰', groupName: '颜色' },
      { name: '黄翡', groupName: '颜色' }, { name: '墨翠', groupName: '颜色' },
      { name: '无色', groupName: '颜色' }, { name: '手工雕', groupName: '工艺' },
      { name: '机雕', groupName: '工艺' }, { name: '素面', groupName: '工艺' },
      { name: '观音', groupName: '题材' }, { name: '佛公', groupName: '题材' },
      { name: '平安扣', groupName: '题材' }, { name: '如意', groupName: '题材' },
      { name: '山水', groupName: '题材' }, { name: '花鸟', groupName: '题材' },
    ];
    for (const t of tags) {
      await prisma.dictTag.upsert({
        where: { name: t.name },
        update: {},
        create: { name: t.name, groupName: t.groupName },
      });
    }
    console.log('✅ Tags inserted (20)');

    // Metal prices
    const silver = await prisma.dictMaterial.findUnique({ where: { name: '银' } });
    const gold18k = await prisma.dictMaterial.findUnique({ where: { name: '18K金' } });
    const today = new Date().toISOString().split('T')[0];
    if (silver) {
      await prisma.metalPrice.create({ data: { materialId: silver.id, pricePerGram: 25, effectiveDate: today } });
    }
    if (gold18k) {
      await prisma.metalPrice.create({ data: { materialId: gold18k.id, pricePerGram: 780, effectiveDate: today } });
    }
    console.log('✅ Metal prices inserted');

    console.log('🎉 Database initialization complete!');
    initialized = true;
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Don't throw — let the app try to start anyway
  }
}
