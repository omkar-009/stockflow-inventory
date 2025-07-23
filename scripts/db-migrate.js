require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'stockflow',
  multipleStatements: true
};

function executeQuery(query) {
  const command = `mysql -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} -e "${query}"`;
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error('Error executing query:', error.message);
    return false;
  }
}

function runSqlFile(filePath) {
  const command = `mysql -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database} < "${filePath}"`;
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`Successfully executed ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error executing ${filePath}:`, error.message);
    return false;
  }
}

function createDatabase() {
  console.log('Creating database...');
  const query = `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
  return executeQuery(query);
}

function runMigrations() {
  console.log('Running migrations...');
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found.');
    return true;
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    console.log(`Running migration: ${file}`);
    if (!runSqlFile(path.join(migrationsDir, file))) {
      return false;
    }
  }
  
  return true;
}

function seedDatabase() {
  console.log('Seeding database...');
  const seedersDir = path.join(__dirname, '..', 'seeders');
  
  if (!fs.existsSync(seedersDir)) {
    console.log('No seeders directory found.');
    return true;
  }
  
  const seedFiles = fs.readdirSync(seedersDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  for (const file of seedFiles) {
    console.log(`Running seeder: ${file}`);
    if (!runSqlFile(path.join(seedersDir, file))) {
      return false;
    }
  }
  
  return true;
}

async function main() {
  console.log('=== StockFlow Database Setup ===');
  
  if (!createDatabase()) {
    console.error('Failed to create database');
    process.exit(1);
  }
  
  if (!runMigrations()) {
    console.error('Database migrations failed');
    process.exit(1);
  }
  
  rl.question('Do you want to seed the database with initial data? (y/n) ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      if (!seedDatabase()) {
        console.error('Database seeding failed');
        rl.close();
        process.exit(1);
      }
    }
    
    console.log('Database setup completed successfully!');
    rl.close();
  });
}

main().catch(console.error);
