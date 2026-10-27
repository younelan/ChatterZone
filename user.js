import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dbPath = path.join(__dirname, 'community.db');

// Connect to SQLite (creates the database file automatically if it doesn't exist)
const db = new DatabaseSync(dbPath);

// Automatically create the users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    password TEXT NOT NULL,
    confirm TEXT,
    bio TEXT DEFAULT ''
  );
`);

console.log('Connected to SQLite database at', dbPath);

class SqliteUser {
  async addUser(userInfo, successCallback, failureCallback) {
    try {
      const stmt = db.prepare(`
        INSERT INTO users (login, email, firstname, lastname, password, confirm)
        VALUES (@login, @email, @firstname, @lastname, @password, @confirm)
      `);
      stmt.run({
        login: userInfo.login,
        email: userInfo.email,
        firstname: userInfo.firstname,
        lastname: userInfo.lastname,
        password: userInfo.password,
        confirm: userInfo.confirm || ''
      });
      console.log('User added successfully');
      if (successCallback) await successCallback();
      return true;
    } catch (error) {
      console.error('Error adding user:', error);
      if (failureCallback) await failureCallback(error);
      return false;
    }
  }

  async findUser(query) {
    try {
      const keys = Object.keys(query);
      if (keys.length === 0) return null;
      const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
      const values = keys.map(k => query[k]);
      const stmt = db.prepare(`SELECT * FROM users WHERE ${whereClause} LIMIT 1`);
      const user = stmt.get(...values);
      return user || null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  }

  async loginUser(credentials) {
    try {
      const user = await this.findUser(credentials);
      return user;
    } catch (error) {
      console.error('Error logging in:', error);
      return null;
    }
  }

  async listUsers() {
    try {
      const stmt = db.prepare(`SELECT * FROM users ORDER BY id ASC`);
      return stmt.all();
    } catch (error) {
      console.error('Error listing users:', error);
      return [];
    }
  }

  async updateUser(id, updateData) {
    try {
      const stmt = db.prepare(`
        UPDATE users
        SET firstname = @firstname,
            lastname = @lastname,
            email = @email,
            bio = @bio
        WHERE id = @id
      `);
      stmt.run({
        id,
        firstname: updateData.firstname,
        lastname: updateData.lastname,
        email: updateData.email,
        bio: updateData.bio || ''
      });
      return await this.findUser({ id });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

export default SqliteUser;
export { SqliteUser, SqliteUser as MongoUser, db };
