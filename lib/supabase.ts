import { getDb, queryAll, queryOne, execute, generateId } from './db';

type Row = Record<string, any>;

class QueryBuilder {
  private table: string;
  private columns = '*';
  private filters: string[] = [];
  private params: any[] = [];
  private orderBy = '';
  private orderAsc = true;
  private singleMode = false;

  constructor(table: string) { this.table = table; }

  select(cols: string) { this.columns = cols; return this; }

  eq(field: string, value: any) {
    this.filters.push(`"${field}" = ?`);
    this.params.push(value);
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push(`"${field}" != ?`);
    this.params.push(value);
    return this;
  }

  in(field: string, values: any[]) {
    if (values.length === 0) { this.filters.push('1=0'); return this; }
    const placeholders = values.map(() => '?').join(',');
    this.filters.push(`"${field}" IN (${placeholders})`);
    this.params.push(...values);
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this.orderBy = field;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  single() { this.singleMode = true; return this; }

  private buildWhere(): string {
    if (this.filters.length === 0) return '';
    return ' WHERE ' + this.filters.join(' AND ');
  }

  private async selectExec(): Promise<{ data: any; error: any }> {
    try {
      await getDb();
      const where = this.buildWhere();
      let sql = `SELECT ${this.columns} FROM "${this.table}"${where}`;
      if (this.orderBy) sql += ` ORDER BY "${this.orderBy}" ${this.orderAsc ? 'ASC' : 'DESC'}`;
      const rows = queryAll(sql, this.params);
      const data = this.singleMode ? (rows.length > 0 ? rows[0] : null) : rows;
      return { data, error: null };
    } catch (e) {
      return { data: null, error: { message: String(e) } };
    }
  }

  private async insertExec(rows: Row[]): Promise<{ data: Row[]; error: any }> {
    try {
      await getDb();
      const results: Row[] = [];
      for (const item of rows) {
        const id = item.id || generateId();
        const cols: string[] = ['"id"'];
        const vals: any[] = [id];
        const placeholders: string[] = ['?'];
        for (const [k, v] of Object.entries(item)) {
          if (k === 'id') continue;
          cols.push(`"${k}"`);
          vals.push(v ?? null);
          placeholders.push('?');
        }
        const sql = `INSERT OR REPLACE INTO "${this.table}" (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
        execute(sql, vals);
        results.push({ ...item, id });
      }
      return { data: results, error: null };
    } catch (e) {
      return { data: [], error: { message: String(e) } };
    }
  }

  private async updateExec(obj: Row): Promise<{ data: null; error: any }> {
    try {
      await getDb();
      const where = this.buildWhere();
      const setClauses: string[] = [];
      const vals: any[] = [];
      for (const [k, v] of Object.entries(obj)) {
        setClauses.push(`"${k}" = ?`);
        vals.push(v ?? null);
      }
      const sql = `UPDATE "${this.table}" SET ${setClauses.join(',')}${where}`;
      execute(sql, [...vals, ...this.params]);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: String(e) } };
    }
  }

  private async upsertExec(obj: Row, onConflict?: string): Promise<{ data: Row[]; error: any }> {
    try {
      await getDb();
      const id = obj.id || generateId();
      const cols: string[] = ['"id"'];
      const vals: any[] = [id];
      const placeholders: string[] = ['?'];
      const updateClauses: string[] = [];
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'id') continue;
        cols.push(`"${k}"`);
        vals.push(v ?? null);
        placeholders.push('?');
        updateClauses.push(`"${k}" = excluded."${k}"`);
      }
      const conflictCol = onConflict ? `"${onConflict.replace(/['"]/g, '')}"` : '"id"';
      const sql = `INSERT INTO "${this.table}" (${cols.join(',')}) VALUES (${placeholders.join(',')}) ON CONFLICT(${conflictCol}) DO UPDATE SET ${updateClauses.join(',')}`;
      execute(sql, vals);
      return { data: [{ ...obj, id }], error: null };
    } catch (e) {
      return { data: [], error: { message: String(e) } };
    }
  }

  then(resolve: (v: any) => any) {
    return this.selectExec().then(resolve);
  }

  insert(rows: Row | Row[]) {
    const arr = Array.isArray(rows) ? rows : [rows];
    return { select: () => this.insertExec(arr) };
  }

  update(obj: Row) {
    const chain: any = {};
    chain.eq = (field: string, value: any) => {
      this.filters.push(`"${field}" = ?`);
      this.params.push(value);
      return chain;
    };
    chain.then = (resolve: (v: any) => any) => this.updateExec(obj).then(resolve);
    return chain;
  }

  upsert(obj: Row, opts?: { onConflict?: string }) {
    return { then: (resolve: (v: any) => any) => this.upsertExec(obj, opts?.onConflict).then(resolve) };
  }

  private async deleteExec(): Promise<{ data: null; error: any }> {
    try {
      await getDb();
      const where = this.buildWhere();
      const sql = `DELETE FROM "${this.table}"${where}`;
      execute(sql, this.params);
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: { message: String(e) } };
    }
  }

  delete() {
    const builder = this;
    const chain: any = {};
    chain.eq = (field: string, value: any) => {
      builder.filters.push(`"${field}" = ?`);
      builder.params.push(value);
      return chain;
    };
    chain.then = (resolve: (v: any) => any) => builder.deleteExec().then(resolve);
    return chain;
  }
}

class SupabaseMock {
  from(table: string) { return new QueryBuilder(table); }
}

let client: SupabaseMock | null = null;

export function getSupabase(): SupabaseMock {
  if (!client) client = new SupabaseMock();
  return client;
}

export function getSupabaseAdmin(): SupabaseMock {
  return getSupabase();
}

export async function uploadImage(bytes: Buffer, filename: string, contentType: string): Promise<string | null> {
  const { writeFile, mkdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const crypto = await import('node:crypto');
  try {
    const uploadsDir = join(process.cwd(), 'data', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const ext = filename.split('.').pop() || 'jpg';
    const name = `${crypto.randomUUID()}.${ext}`;
    await writeFile(join(uploadsDir, name), bytes);
    return `/api/uploads/${name}`;
  } catch {
    return null;
  }
}
