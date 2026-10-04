import { supabase } from '../lib/supabase';

/**
 * Initialize Database / Session check
 */
export async function initDatabase() {
  return true;
}

/**
 * Get all available areas for assignment & selection
 */
export async function getAreas() {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select('id, name')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return [
        { id: 1, name: 'Ward 1' },
        { id: 2, name: 'Ward 2' },
        { id: 3, name: 'Ward 3' },
        { id: 4, name: 'Ward 4' },
        { id: 5, name: 'Ward 5' },
        { id: 6, name: 'Ward 6' },
        { id: 7, name: 'Ward 7' },
        { id: 8, name: 'Ward 8' },
        { id: 9, name: 'Ward 9' },
        { id: 10, name: 'Ward 10' },
      ];
    }

    return data;
  } catch (err) {
    console.warn('Error in getAreas:', err);
    return [];
  }
}

/**
 * Restore current session and profile
 */
export async function getCurrentUser() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return null;
    }

    const userId = session.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, name, phone, area_id, eco_points, expo_push_token, areas(id, name)')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      const defaultRole = session.user.user_metadata?.role || 'citizen';
      const defaultName = session.user.user_metadata?.name || 'User';
      const defaultPhone = session.user.user_metadata?.phone || '';
      const defaultAreaId = session.user.user_metadata?.area_id || null;

      // Try creating profile row if missing
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          role: defaultRole,
          name: defaultName,
          phone: defaultPhone,
          area_id: defaultAreaId,
          eco_points: 0,
        });
      } catch {}

      return {
        id: userId,
        email: session.user.email,
        identifier: session.user.email,
        role: defaultRole,
        name: defaultName,
        phone: defaultPhone,
        area_id: defaultAreaId,
        area: defaultAreaId ? `Ward ${defaultAreaId}` : '',
        eco_points: 0,
      };
    }

    return {
      id: profile.id,
      email: session.user.email,
      identifier: session.user.email,
      role: profile.role,
      name: profile.name,
      phone: profile.phone,
      area_id: profile.area_id,
      area: profile.areas?.name || (profile.area_id ? `Ward ${profile.area_id}` : ''),
      eco_points: profile.eco_points || 0,
      expo_push_token: profile.expo_push_token,
    };
  } catch (e) {
    console.error('Error getting current user:', e);
    return null;
  }
}

/**
 * Normalize identifier to email format for Supabase Auth
 */
function normalizeEmail(identifier) {
  const clean = (identifier || '').trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }
  return `${clean.replace(/[^a-z0-9_]/g, '')}@shodhini.app`;
}

/**
 * Sign up user with Supabase Auth & create profile
 */
export async function signUpUser({ role, name, phone, identifier, areaId, password }) {
  const email = normalizeEmail(identifier);
  const cleanPass = (password || '').trim();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: cleanPass,
    options: {
      data: {
        role,
        name: name.trim(),
        phone: phone.trim(),
        area_id: areaId,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authData.user?.id;
  if (!userId) {
    throw new Error('Registration failed. Please try again.');
  }

  // Attempt login to acquire active session
  let session = authData.session;
  if (!session) {
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass,
    });

    if (signInError) {
      throw new Error(
        'Account created, but email confirmation is enabled in your Supabase project. Please disable "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email).'
      );
    }
    session = signInData.session;
  }

  // Insert or update profile row
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      role,
      name: name.trim(),
      phone: phone.trim(),
      area_id: areaId || null,
      eco_points: 0,
    });
  } catch (pe) {
    console.warn('Profile upsert note:', pe);
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Could not establish user session. Please log in.');
  }

  return user;
}

/**
 * Login user with Supabase Auth
 */
export async function loginUser({ role, identifier, password }) {
  const email = normalizeEmail(identifier);
  const cleanPass = (password || '').trim();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: cleanPass,
  });

  if (authError) {
    if (authError.message?.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'Email is not confirmed. Please disable "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email).'
      );
    }
    throw new Error(authError.message || 'Invalid credentials or account does not exist.');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('User profile could not be loaded.');
  }

  if (currentUser.role && currentUser.role !== role) {
    await supabase.auth.signOut();
    throw new Error(
      `This account is registered as a ${
        currentUser.role === 'worker' ? 'Garbage Collector' : 'Citizen'
      }, not a ${role === 'worker' ? 'Garbage Collector' : 'Citizen'}. Please switch roles at the top.`
    );
  }

  return currentUser;
}

/**
 * Logout user
 */
export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error logging out:', e);
    return false;
  }
}

/**
 * Insert a new complaint with session validation
 */
export async function fileComplaint({
  citizenId,
  areaId,
  category,
  description,
  latitude = null,
  longitude = null,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('Your session has expired or is invalid. Please log out and log in again.');
  }

  const activeUserId = session.user.id;

  const { data, error } = await supabase
    .from('complaints')
    .insert({
      citizen_id: activeUserId,
      area_id: areaId,
      category,
      description,
      latitude,
      longitude,
      status: 'Submitted',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to file complaint.');
  }

  return data;
}

/**
 * Fetch complaints filed by a citizen
 */
export async function getUserComplaints(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select(
        'id, citizen_id, area_id, category, description, latitude, longitude, status, assigned_worker_id, eco_points, created_at, areas(name)'
      )
      .eq('citizen_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user complaints:', error.message);
      return [];
    }

    return (data || []).map((c) => ({
      ...c,
      location:
        c.areas?.name ||
        (c.latitude && c.longitude
          ? `Lat: ${c.latitude.toFixed(4)}, Lng: ${c.longitude.toFixed(4)}`
          : c.area_id
          ? `Ward ${c.area_id}`
          : 'Local Area'),
    }));
  } catch (e) {
    console.error('Error in getUserComplaints:', e);
    return [];
  }
}

/**
 * Fetch total eco points for a user
 */
export async function getUserEcoPoints(userId) {
  if (!userId) return 0;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('eco_points')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching eco points:', error.message);
      return 0;
    }

    return data?.eco_points || 0;
  } catch (e) {
    console.warn('Error in getUserEcoPoints:', e);
    return 0;
  }
}

/**
 * Fetch complaints for an area (for collectors)
 */
export async function getAreaComplaints(areaId) {
  if (!areaId) return [];
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select(
        'id, citizen_id, area_id, category, description, latitude, longitude, status, assigned_worker_id, eco_points, created_at, areas(name), profiles:citizen_id(name, phone)'
      )
      .eq('area_id', areaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching area complaints:', error.message);
      return [];
    }

    return (data || []).map((c) => ({
      ...c,
      location:
        c.areas?.name ||
        (c.latitude && c.longitude
          ? `Lat: ${c.latitude.toFixed(4)}, Lng: ${c.longitude.toFixed(4)}`
          : `Ward ${c.area_id}`),
      citizenName: c.profiles?.name || 'Citizen',
      citizenPhone: c.profiles?.phone || '',
    }));
  } catch (e) {
    console.error('Error in getAreaComplaints:', e);
    return [];
  }
}

/**
 * Update complaint status (collector action)
 */
export async function updateComplaintStatus({ complaintId, status, workerId }) {
  const updatePayload = { status };
  if (workerId) {
    updatePayload.assigned_worker_id = workerId;
  }

  const { data, error } = await supabase
    .from('complaints')
    .update(updatePayload)
    .eq('id', complaintId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message || 'Failed to update complaint status.');
  }

  return data;
}

/**
 * Update user Expo Push Token in profile
 */
export async function updateUserPushToken(userId, token) {
  if (!userId || !token) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.warn('Error saving expo push token:', error.message);
    }
  } catch (e) {
    console.warn('Failed to update push token:', e);
  }
}
