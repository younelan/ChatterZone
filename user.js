import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const dbPath = path.join(__dirname, 'community.db');

// Connect to SQLite (creates the database file automatically if it doesn't exist)
const db = new DatabaseSync(dbPath);

// Automatically create the users and messages tables if they don't exist
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

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
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

  // --- Messaging / Discussion Methods ---

  async sendMessage({ sender_id, recipient_id, body }) {
    try {
      const stmt = db.prepare(`
        INSERT INTO messages (sender_id, recipient_id, subject, body, is_read)
        VALUES (@sender_id, @recipient_id, '', @body, 0)
      `);
      const info = stmt.run({
        sender_id,
        recipient_id,
        body
      });
      return info.lastInsertRowid;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getConversations(userId) {
    try {
      const stmt = db.prepare(`
        SELECT
          u.id as contact_id,
          u.login as contact_login,
          u.firstname as contact_firstname,
          u.lastname as contact_lastname,
          last_msg.body as last_message,
          last_msg.created_at as last_message_time,
          last_msg.sender_id as last_sender_id,
          COALESCE(unread.cnt, 0) as unread_count
        FROM users u
        JOIN (
          SELECT
            CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as other_id,
            MAX(id) as max_msg_id
          FROM messages
          WHERE sender_id = ? OR recipient_id = ?
          GROUP BY other_id
        ) latest ON u.id = latest.other_id
        JOIN messages last_msg ON last_msg.id = latest.max_msg_id
        LEFT JOIN (
          SELECT sender_id, COUNT(*) as cnt
          FROM messages
          WHERE recipient_id = ? AND is_read = 0
          GROUP BY sender_id
        ) unread ON unread.sender_id = u.id
        ORDER BY last_msg.created_at DESC
      `);
      return stmt.all(userId, userId, userId, userId);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async getThread(userId, contactId) {
    try {
      const stmt = db.prepare(`
        SELECT m.*,
               s.login as sender_login,
               s.firstname as sender_firstname,
               s.lastname as sender_lastname,
               r.login as recipient_login,
               r.firstname as recipient_firstname,
               r.lastname as recipient_lastname
        FROM messages m
        JOIN users s ON m.sender_id = s.id
        JOIN users r ON m.recipient_id = r.id
        WHERE (m.sender_id = ? AND m.recipient_id = ?)
           OR (m.sender_id = ? AND m.recipient_id = ?)
        ORDER BY m.created_at ASC
      `);
      const messages = stmt.all(userId, contactId, contactId, userId);

      // Mark incoming messages from contact as read
      db.prepare(`
        UPDATE messages
        SET is_read = 1
        WHERE sender_id = ? AND recipient_id = ? AND is_read = 0
      `).run(contactId, userId);

      return messages;
    } catch (error) {
      console.error('Error fetching thread:', error);
      return [];
    }
  }

  async getUnreadCount(userId) {
    try {
      const stmt = db.prepare(`
        SELECT COUNT(*) as unread_count
        FROM messages
        WHERE recipient_id = ? AND is_read = 0
      `);
      const row = stmt.get(userId);
      return row ? row.unread_count : 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

export default SqliteUser;
export { SqliteUser, SqliteUser as MongoUser, db };
