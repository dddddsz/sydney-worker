import { Session, SessionMessage } from './index';
import { logLine, LogContext } from '../ctx';

const MAX_MESSAGES = 20;

export class SessionStore {
  constructor(private db: D1Database) {}

  buildId(type: 'private' | 'group', userId: number, groupId?: number): string {
    if (type === 'private') {
      return `private:${userId}`;
    }
    return `group:${userId}:${groupId}`;
  }

  async get(id: string, ctx?: LogContext): Promise<Session | null> {
    try {
      const row = await this.db
        .prepare('SELECT * FROM sessions WHERE id = ?')
        .bind(id)
        .first<{
          id: string;
          type: string;
          user_id: number;
          group_id: number | null;
          messages: string;
          created_at: number;
          updated_at: number;
        }>();

      if (!row) return null;

      return {
        id: row.id,
        type: row.type as 'private' | 'group',
        user_id: row.user_id,
        group_id: row.group_id,
        messages: JSON.parse(row.messages) as SessionMessage[],
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (err: any) {
      logLine(ctx ?? { requestId: 'session', startTime: Date.now() }, 'session/store', `get id="${id}" err="${err.message}"`, 'ERROR');
      throw err;
    }
  }

  async create(session: Session, ctx?: LogContext): Promise<void> {
    try {
      await this.db
        .prepare(
          'INSERT INTO sessions (id, type, user_id, group_id, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          session.id,
          session.type,
          session.user_id,
          session.group_id,
          JSON.stringify(session.messages),
          session.created_at,
          session.updated_at,
        )
        .run();
    } catch (err: any) {
      logLine(ctx ?? { requestId: 'session', startTime: Date.now() }, 'session/store', `create id="${session.id}" err="${err.message}"`, 'ERROR');
      throw err;
    }
  }

  async delete(id: string, ctx?: LogContext): Promise<void> {
    try {
      await this.db
        .prepare('DELETE FROM sessions WHERE id = ?')
        .bind(id)
        .run();
    } catch (err: any) {
      logLine(ctx ?? { requestId: 'session', startTime: Date.now() }, 'session/store', `delete id="${id}" err="${err.message}"`, 'ERROR');
      throw err;
    }
  }

  async append(id: string, message: SessionMessage, ctx?: LogContext): Promise<Session> {
    const now = Date.now();
    let session = await this.get(id, ctx);

    if (!session) {
      const parts = id.split(':');
      const type = parts[0] as 'private' | 'group';
      const userId = Number(parts[1]);
      const groupId = parts.length > 2 ? Number(parts[2]) : null;

      session = {
        id,
        type,
        user_id: userId,
        group_id: groupId,
        messages: [],
        created_at: now,
        updated_at: now,
      };
      await this.create(session, ctx);
    }

    session.messages.push(message);
    session.updated_at = now;

    this.trimSession(session);

    try {
      await this.db
        .prepare('UPDATE sessions SET messages = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(session.messages), session.updated_at, session.id)
        .run();
    } catch (err: any) {
      logLine(ctx ?? { requestId: 'session', startTime: Date.now() }, 'session/store', `append id="${id}" err="${err.message}"`, 'ERROR');
      throw err;
    }

    return session;
  }

  async getContext(id: string, maxCount = MAX_MESSAGES, ctx?: LogContext): Promise<SessionMessage[]> {
    const session = await this.get(id, ctx);
    if (!session) return [];
    return session.messages.slice(-maxCount);
  }

  private trimSession(session: Session): void {
    if (session.messages.length > MAX_MESSAGES) {
      const excess = session.messages.length - MAX_MESSAGES;
      session.messages.splice(0, excess);
    }
  }
}
