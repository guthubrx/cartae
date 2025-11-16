/**
 * Create Initial Super Admin User
 * Session 88 - Enterprise Multi-User Per Tenant
 *
 * Creates the first super_admin user for system bootstrapping
 */

import * as bcrypt from 'bcrypt';
import { pool } from '../src/db/client';

const SALT_ROUNDS = 10;

async function createAdminUser() {
  try {
    console.log('🔄 Creating initial super admin user...\n');

    // Admin credentials (change these in production!)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cartae.app';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!ChangeMe';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists with email:', adminEmail);
      console.log('Skipping creation.\n');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    // Create admin user
    const userResult = await pool.query(
      `INSERT INTO users (email, password, name, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, name, created_at`,
      [adminEmail, hashedPassword, adminName]
    );

    const newAdmin = userResult.rows[0];

    // Get super_admin role ID
    const roleResult = await pool.query(
      `SELECT id FROM roles WHERE name = 'super_admin'`
    );

    if (roleResult.rows.length === 0) {
      throw new Error('super_admin role not found. Run migrations first!');
    }

    const superAdminRoleId = roleResult.rows[0].id;

    // Assign super_admin role
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)`,
      [newAdmin.id, superAdminRoleId]
    );

    console.log('✅ Super admin user created successfully!\n');
    console.log('Credentials:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  Name: ${adminName}`);
    console.log(`  Role: super_admin`);
    console.log(`  User ID: ${newAdmin.id}\n`);
    console.log('⚠️  IMPORTANT: Change the password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
