import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '@mantine/hooks';
import { createEmptyBudgetState, createInitialBudgetState, sanitizeBudgetState } from '../data';
import { makeId } from '../budgetMath';
import type { BudgetProfile, BudgetProfileTemplate, BudgetState } from '../types';

const LEGACY_STORAGE_KEY = 'budget-desk-state-v1';
const PROFILES_STORAGE_KEY = 'budget-desk-profiles-v1';
const ACTIVE_PROFILE_STORAGE_KEY = 'budget-desk-active-profile-v1';
const DEFAULT_PROFILE_ID = 'default-profile';

export interface UseBudgetState {
  state: BudgetState;
  profiles: BudgetProfile[];
  activeProfile: BudgetProfile;
  activeProfileId: string;
  setState: (next: BudgetState | ((current: BudgetState) => BudgetState)) => void;
  clearState: () => void;
  createProfile: (name: string, template?: BudgetProfileTemplate) => BudgetProfile;
  renameProfile: (profileId: string, name: string) => void;
  deleteProfile: (profileId: string) => void;
  switchProfile: (profileId: string) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const safeString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const normalizeProfileName = (value: string, fallback = 'Budget profile') =>
  value.trim().replace(/\s+/g, ' ') || fallback;

const nowISO = () => new Date().toISOString();

const createBudgetProfile = (
  name: string,
  state: BudgetState,
  id = `profile-${makeId()}`,
): BudgetProfile => {
  const timestamp = nowISO();

  return {
    id,
    name: normalizeProfileName(name),
    state: sanitizeBudgetState(state),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const createStarterProfile = () =>
  createBudgetProfile('My budget', createInitialBudgetState(), DEFAULT_PROFILE_ID);

const readJsonFromStorage = (key: string): unknown => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const sanitizeProfiles = (value: unknown): BudgetProfile[] => {
  const rawProfiles = Array.isArray(value) ? value.filter(isRecord) : [];
  const seenIds = new Set<string>();

  const profiles = rawProfiles.map((item, index): BudgetProfile => {
    const fallbackId = index === 0 ? DEFAULT_PROFILE_ID : `profile-${index}`;
    let id = safeString(item.id, fallbackId).trim() || fallbackId;
    while (seenIds.has(id)) {
      id = `${id}-${index + 1}`;
    }
    seenIds.add(id);

    return {
      id,
      name: normalizeProfileName(safeString(item.name), `Budget ${index + 1}`),
      state: sanitizeBudgetState(item.state),
      createdAt: safeString(item.createdAt, nowISO()),
      updatedAt: safeString(item.updatedAt, nowISO()),
    };
  });

  return profiles.length > 0 ? profiles : [createStarterProfile()];
};

const getInitialProfiles = () => {
  const storedProfiles = readJsonFromStorage(PROFILES_STORAGE_KEY);
  if (storedProfiles !== undefined) {
    return sanitizeProfiles(storedProfiles);
  }

  const legacyState = readJsonFromStorage(LEGACY_STORAGE_KEY);
  if (legacyState !== undefined) {
    return [createBudgetProfile('My budget', sanitizeBudgetState(legacyState), DEFAULT_PROFILE_ID)];
  }

  return [createStarterProfile()];
};

const getInitialActiveProfileId = () => {
  const storedProfileId = readJsonFromStorage(ACTIVE_PROFILE_STORAGE_KEY);
  return typeof storedProfileId === 'string' ? storedProfileId : DEFAULT_PROFILE_ID;
};

const stateForTemplate = (
  template: BudgetProfileTemplate,
  currentState: BudgetState,
): BudgetState => {
  switch (template) {
    case 'sample':
      return createInitialBudgetState();
    case 'current':
      return currentState;
    case 'empty':
    default:
      return createEmptyBudgetState();
  }
};

/**
 * Budget data is stored as named profiles. Existing single-budget installs are
 * migrated into the default profile the first time this hook loads.
 */
export function useBudgetState(): UseBudgetState {
  const [storedProfiles, setStoredProfiles] = useLocalStorage<BudgetProfile[]>({
    key: PROFILES_STORAGE_KEY,
    defaultValue: getInitialProfiles(),
  });
  const [storedActiveProfileId, setStoredActiveProfileId] = useLocalStorage<string>({
    key: ACTIVE_PROFILE_STORAGE_KEY,
    defaultValue: getInitialActiveProfileId(),
  });

  const profiles = useMemo(() => sanitizeProfiles(storedProfiles), [storedProfiles]);
  const activeProfile = useMemo(
    () =>
      profiles.find((profile) => profile.id === storedActiveProfileId) ??
      profiles[0] ??
      createStarterProfile(),
    [profiles, storedActiveProfileId],
  );
  const activeProfileId = activeProfile.id;
  const state = activeProfile.state;

  const setState = useCallback(
    (next: BudgetState | ((current: BudgetState) => BudgetState)) => {
      setStoredProfiles((current) => {
        const currentProfiles = sanitizeProfiles(current);
        const fallbackProfile = currentProfiles[0] ?? createStarterProfile();
        const profileId = currentProfiles.some((profile) => profile.id === activeProfileId)
          ? activeProfileId
          : fallbackProfile.id;

        return currentProfiles.map((profile) => {
          if (profile.id !== profileId) {
            return profile;
          }

          const nextState = typeof next === 'function' ? next(profile.state) : next;
          return {
            ...profile,
            state: sanitizeBudgetState(nextState),
            updatedAt: nowISO(),
          };
        });
      });
    },
    [activeProfileId, setStoredProfiles],
  );

  const clearState = useCallback(() => {
    setState(createInitialBudgetState());
  }, [setState]);

  const createProfile = useCallback(
    (name: string, template: BudgetProfileTemplate = 'empty') => {
      const profile = createBudgetProfile(
        name,
        stateForTemplate(template, activeProfile.state),
      );

      setStoredProfiles((current) => [...sanitizeProfiles(current), profile]);
      setStoredActiveProfileId(profile.id);
      return profile;
    },
    [activeProfile.state, setStoredActiveProfileId, setStoredProfiles],
  );

  const renameProfile = useCallback(
    (profileId: string, name: string) => {
      setStoredProfiles((current) =>
        sanitizeProfiles(current).map((profile) =>
          profile.id === profileId
            ? {
                ...profile,
                name: normalizeProfileName(name, profile.name),
                updatedAt: nowISO(),
              }
            : profile,
        ),
      );
    },
    [setStoredProfiles],
  );

  const deleteProfile = useCallback(
    (profileId: string) => {
      if (profiles.length <= 1) {
        return;
      }

      const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
      if (nextProfiles.length === profiles.length || nextProfiles.length === 0) {
        return;
      }

      setStoredProfiles(nextProfiles);
      const nextActiveProfile = nextProfiles[0];
      if (profileId === activeProfileId && nextActiveProfile) {
        setStoredActiveProfileId(nextActiveProfile.id);
      }
    },
    [activeProfileId, profiles, setStoredActiveProfileId, setStoredProfiles],
  );

  const switchProfile = useCallback(
    (profileId: string) => {
      if (profiles.some((profile) => profile.id === profileId)) {
        setStoredActiveProfileId(profileId);
      }
    },
    [profiles, setStoredActiveProfileId],
  );

  return {
    state,
    profiles,
    activeProfile,
    activeProfileId,
    setState,
    clearState,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
  };
}
