import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- In-memory mock of the vault_items table ----
type Row = {
  id: string;
  user_id: string;
  item_type: string;
  title_encrypted: string;
  content_encrypted: string;
  iv: string;
  updated_at: string;
};

const db: { vault_items: Row[]; audit_logs: any[] } = {
  vault_items: [],
  audit_logs: [],
};

function makeQuery(table: 'vault_items' | 'audit_logs') {
  const state: any = {
    table,
    filters: [] as Array<[string, any]>,
    order: null as null | { col: string; asc: boolean },
    limitN: null as number | null,
    op: 'select' as 'select' | 'insert' | 'update',
    payload: null as any,
  };

  const applyFilters = (rows: any[]) =>
    rows.filter((r) => state.filters.every(([k, v]) => r[k] === v));

  const runSelect = () => {
    let rows = applyFilters(db[table]);
    if (state.order) {
      const { col, asc } = state.order;
      rows = [...rows].sort((a, b) => (a[col] < b[col] ? (asc ? -1 : 1) : a[col] > b[col] ? (asc ? 1 : -1) : 0));
    }
    if (state.limitN != null) rows = rows.slice(0, state.limitN);
    return rows;
  };

  const builder: any = {
    select: (_cols?: string) => builder,
    eq: (col: string, val: any) => {
      state.filters.push([col, val]);
      return builder;
    },
    order: (col: string, opts: { ascending: boolean }) => {
      state.order = { col, asc: opts.ascending };
      return builder;
    },
    limit: (n: number) => {
      state.limitN = n;
      return builder;
    },
    maybeSingle: async () => {
      const rows = runSelect();
      return { data: rows[0] ?? null, error: null };
    },
    single: async () => {
      if (state.op === 'insert') {
        const row: Row = {
          id: crypto.randomUUID(),
          updated_at: new Date().toISOString(),
          ...state.payload,
        };
        db[table].push(row as any);
        return { data: row, error: null };
      }
      if (state.op === 'update') {
        const rows = applyFilters(db[table]);
        rows.forEach((r) => Object.assign(r, state.payload, { updated_at: new Date().toISOString() }));
        return { data: rows[0], error: null };
      }
      const rows = runSelect();
      return { data: rows[0] ?? null, error: null };
    },
    insert: (payload: any) => {
      state.op = 'insert';
      state.payload = payload;
      // Auto-run when awaited without .select()
      const thenable: any = {
        select: (_c?: string) => thenable,
        single: async () => {
          const row: Row = {
            id: crypto.randomUUID(),
            updated_at: new Date().toISOString(),
            ...payload,
          };
          db[table].push(row as any);
          return { data: row, error: null };
        },
        then: (resolve: any) => {
          const row: Row = {
            id: crypto.randomUUID(),
            updated_at: new Date().toISOString(),
            ...payload,
          };
          db[table].push(row as any);
          resolve({ data: row, error: null });
        },
      };
      return thenable;
    },
    update: (payload: any) => {
      state.op = 'update';
      state.payload = payload;
      return builder;
    },
  };
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeQuery(table as any),
  },
}));

// Passthrough crypto mock — deterministic and fast
vi.mock('@/lib/crypto', () => ({
  encrypt: async (plaintext: string) => ({
    ciphertext: `enc:${plaintext}`,
    iv: 'iv-static',
  }),
  decrypt: async (ciphertext: string) => ciphertext.replace(/^enc:/, ''),
}));

import {
  EMPTY_FAMILY_PROFILE,
  getFamilyIdentity,
  isFamilyIdentityComplete,
  loadLatestFamilyProfile,
  saveFamilyProfile,
} from '@/lib/familyProfile';

const USER_ID = 'user-1';
const PASSPHRASE = 'test-pass';
const SALT = 'test-salt';

const completeProfile = () => ({
  ...EMPTY_FAMILY_PROFILE,
  personal_info: {
    ...EMPTY_FAMILY_PROFILE.personal_info,
    first_name: 'Ahmed',
    last_name: 'Benali',
    full_name: 'Ahmed Benali',
    birth_date: '1990-05-12',
    gender: 'male' as const,
  },
  parents: {
    ...EMPTY_FAMILY_PROFILE.parents,
    father_first_name: 'Karim',
  },
});

describe('Onboarding — persistence & idempotency', () => {
  beforeEach(() => {
    db.vault_items = [];
    db.audit_logs = [];
  });

  it('persists a complete identity to the database on first save', async () => {
    const id = await saveFamilyProfile({
      userId: USER_ID,
      passphrase: PASSPHRASE,
      salt: SALT,
      data: completeProfile(),
      existingId: null,
    });
    expect(id).toBeTruthy();
    expect(db.vault_items).toHaveLength(1);
    expect(db.vault_items[0].item_type).toBe('family_profile');
    expect(db.vault_items[0].user_id).toBe(USER_ID);
  });

  it('reloads the same identity across sessions (persisted after reload)', async () => {
    await saveFamilyProfile({
      userId: USER_ID, passphrase: PASSPHRASE, salt: SALT,
      data: completeProfile(), existingId: null,
    });

    const latest = await loadLatestFamilyProfile(USER_ID, PASSPHRASE, SALT);
    expect(latest).not.toBeNull();
    const identity = getFamilyIdentity(latest!.data);
    expect(identity).toEqual({
      first_name: 'Ahmed',
      last_name: 'Benali',
      gender: 'male',
      birth_date: '1990-05-12',
      father_first_name: 'Karim',
    });
    expect(isFamilyIdentityComplete(identity)).toBe(true);
  });

  it('does not trigger onboarding again once identity is complete (gate stays closed)', async () => {
    await saveFamilyProfile({
      userId: USER_ID, passphrase: PASSPHRASE, salt: SALT,
      data: completeProfile(), existingId: null,
    });

    // Simulate multiple route mounts — each reloads state independently
    for (let i = 0; i < 3; i++) {
      const latest = await loadLatestFamilyProfile(USER_ID, PASSPHRASE, SALT);
      const identity = getFamilyIdentity(latest?.data);
      expect(isFamilyIdentityComplete(identity)).toBe(true);
    }
    // Only the single original row exists — no duplicate created on remounts
    expect(db.vault_items).toHaveLength(1);
  });

  it('updates the existing row instead of inserting a new one on re-save', async () => {
    const id = await saveFamilyProfile({
      userId: USER_ID, passphrase: PASSPHRASE, salt: SALT,
      data: completeProfile(), existingId: null,
    });

    const updated = completeProfile();
    updated.personal_info.last_name = 'El-Amrani';
    const id2 = await saveFamilyProfile({
      userId: USER_ID, passphrase: PASSPHRASE, salt: SALT,
      data: updated, existingId: id,
    });

    expect(id2).toBe(id);
    expect(db.vault_items).toHaveLength(1);
    const latest = await loadLatestFamilyProfile(USER_ID, PASSPHRASE, SALT);
    expect(latest!.data.personal_info.last_name).toBe('El-Amrani');
  });

  it('flags incomplete identity so the onboarding gate blocks the app', async () => {
    const partial = { ...EMPTY_FAMILY_PROFILE };
    partial.personal_info = {
      ...partial.personal_info,
      first_name: 'Ahmed',
      last_name: '',
      birth_date: '',
      gender: '',
    };
    await saveFamilyProfile({
      userId: USER_ID, passphrase: PASSPHRASE, salt: SALT,
      data: partial, existingId: null,
    });

    const latest = await loadLatestFamilyProfile(USER_ID, PASSPHRASE, SALT);
    expect(isFamilyIdentityComplete(getFamilyIdentity(latest!.data))).toBe(false);
  });

  it('scopes identity per user (another user does not inherit the profile)', async () => {
    await saveFamilyProfile({
      userId: USER_ID, passphrase: PASSPHRASE, salt: SALT,
      data: completeProfile(), existingId: null,
    });
    const other = await loadLatestFamilyProfile('user-2', PASSPHRASE, SALT);
    expect(other).toBeNull();
  });
});
