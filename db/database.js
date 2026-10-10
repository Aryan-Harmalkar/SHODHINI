import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';

/**
 * Initialize Database / Session check
 */
export async function initDatabase() {
  return true;
}

/**
 * Get collector on-duty status (true = Online/Active, false = Offline/Off-Duty)
 */
export async function getCollectorDutyStatus(userId) {
  if (!userId) return true;
  const storageKey = `shodhini_collector_duty_${userId}`;
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === 'true';
    } else {
      const stored = await SecureStore.getItemAsync(storageKey);
      if (stored !== null) return stored === 'true';
    }
  } catch {}

  try {
    const { data } = await supabase
      .from('profiles')
      .select('is_online')
      .eq('id', userId)
      .maybeSingle();
    if (data && typeof data.is_online === 'boolean') {
      return data.is_online;
    }
  } catch {}

  return true;
}

/**
 * Set collector on-duty status (Online vs Offline)
 */
export async function setCollectorDutyStatus(userId, isOnline) {
  if (!userId) return isOnline;
  const storageKey = `shodhini_collector_duty_${userId}`;
  const strVal = isOnline ? 'true' : 'false';

  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(storageKey, strVal);
    } else {
      await SecureStore.setItemAsync(storageKey, strVal);
    }
  } catch {}

  try {
    await supabase
      .from('profiles')
      .update({ is_online: Boolean(isOnline) })
      .eq('id', userId);
  } catch (err) {
    console.warn('Note: Could not update remote is_online status:', err?.message);
  }

  return isOnline;
}

export const ASSAGAO_VILLAGE = 'Assagao';

export const ASSAGAO_WARDS = [
  { id: 1, name: 'Assagao - Ward 1 (Ghateshwar Nagar)', shortName: 'Ward 1 (Ghateshwar Nagar)', village: 'Assagao' },
  { id: 2, name: 'Assagao - Ward 2 (Bouta Waddo)', shortName: 'Ward 2 (Bouta Waddo)', village: 'Assagao' },
  { id: 3, name: 'Assagao - Ward 3 (Socol Waddo)', shortName: 'Ward 3 (Socol Waddo)', village: 'Assagao' },
  { id: 4, name: 'Assagao - Ward 4 (Badem)', shortName: 'Ward 4 (Badem)', village: 'Assagao' },
  { id: 5, name: 'Assagao - Ward 5 (Monforte Vaddo)', shortName: 'Ward 5 (Monforte Vaddo)', village: 'Assagao' },
  { id: 6, name: 'Assagao - Ward 6 (Mazal Waddo)', shortName: 'Ward 6 (Mazal Waddo)', village: 'Assagao' },
  { id: 7, name: 'Assagao - Ward 7 (Igrej Waddo)', shortName: 'Ward 7 (Igrej Waddo)', village: 'Assagao' },
];

export const ASSAGAO_WARD_MAP = ASSAGAO_WARDS.reduce((acc, curr) => {
  acc[curr.id] = curr.name;
  return acc;
}, {});

export function formatWardName(areaId, fallback = null) {
  const numId = Number(areaId);
  if (numId && ASSAGAO_WARD_MAP[numId]) {
    return ASSAGAO_WARD_MAP[numId];
  }
  if (typeof areaId === 'string') {
    const strMatch = areaId.match(/Ward\s*(\d+)/i);
    if (strMatch && ASSAGAO_WARD_MAP[strMatch[1]]) {
      return ASSAGAO_WARD_MAP[strMatch[1]];
    }
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    const match = fallback.match(/Ward\s*(\d+)/i);
    if (match && ASSAGAO_WARD_MAP[match[1]]) {
      return ASSAGAO_WARD_MAP[match[1]];
    }
    return fallback;
  }
  return 'Assagao - Ward 1 (Ghateshwar Nagar)';
}

/**
 * Get all available areas for assignment & selection (Assagao Village - 7 Wards)
 */
export async function getAreas() {
  try {
    const { data, error } = await supabase
      .from('areas')
      .select('id, name')
      .order('id', { ascending: true });

    if (error || !data || data.length === 0) {
      return ASSAGAO_WARDS.map((w) => ({ id: w.id, name: w.name }));
    }

    const filtered = data.filter((a) => a.id <= 7);
    if (filtered.length === 0) {
      return ASSAGAO_WARDS.map((w) => ({ id: w.id, name: w.name }));
    }

    return filtered.map((a) => ({
      id: a.id,
      name: formatWardName(a.id, a.name),
    }));
  } catch (err) {
    console.warn('Error in getAreas:', err);
    return ASSAGAO_WARDS.map((w) => ({ id: w.id, name: w.name }));
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
      .select('id, role, name, phone, area_id, eco_points, expo_push_token, gc_class, areas(id, name)')
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
        role: defaultRole,
        name: defaultName,
        phone: defaultPhone,
        identifier: defaultPhone,
        area_id: defaultAreaId || 1,
        area: formatWardName(defaultAreaId),
        eco_points: 0,
      };
    }

    return {
      id: profile.id,
      role: profile.role,
      name: profile.name,
      phone: profile.phone,
      identifier: profile.phone,
      area_id: profile.area_id || 1,
      area: formatWardName(profile.area_id, profile.areas?.name),
      eco_points: profile.eco_points || 0,
      expo_push_token: profile.expo_push_token,
    };
  } catch (e) {
    console.error('Error getting current user:', e);
    return null;
  }
}

/**
 * Normalize phone number to 10 digits
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Convert phone number to Supabase internal email
 */
function phoneToEmail(phone) {
  const clean = normalizePhone(phone);
  return `${clean}@shodhini.app`;
}

/**
 * Sign up user with Phone Number & create profile
 */
export async function signUpUser({ role, name, phone, areaId, password }) {
  const cleanPhone = normalizePhone(phone);
  const cleanPass = (password || '').trim();

  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Please enter a valid 10-digit mobile phone number.');
  }
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const email = phoneToEmail(cleanPhone);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: cleanPass,
    options: {
      data: {
        role,
        name: name.trim(),
        phone: cleanPhone,
        area_id: areaId,
      },
    },
  });

  if (authError) {
    if (
      authError.message?.toLowerCase().includes('already registered') ||
      authError.message?.toLowerCase().includes('already exists')
    ) {
      throw new Error('An account with this phone number already exists. Please log in.');
    }
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
        'Account created, but verification is required in your Supabase project. Please disable "Confirm email" in Supabase Dashboard (Authentication -> Providers -> Email).'
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
      phone: cleanPhone,
      area_id: areaId || null,
      eco_points: 0,
      gc_class: role === 'WORKER' ? 'Class B' : null,
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
 * Login user with Phone Number & password
 */
export async function loginUser({ role, phone, identifier, password }) {
  const rawInput = phone || identifier || '';
  const cleanPhone = normalizePhone(rawInput);
  const cleanPass = (password || '').trim();

  if (!cleanPhone && !rawInput.includes('@')) {
    throw new Error('Please enter your mobile phone number.');
  }

  // 1. Primary attempt: cleanPhone@shodhini.app
  const primaryEmail = cleanPhone ? phoneToEmail(cleanPhone) : rawInput.trim().toLowerCase();
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: primaryEmail,
    password: cleanPass,
  });

  // 2. Fallback attempt: if user previously signed up with other format
  if (authError && rawInput && rawInput !== cleanPhone) {
    const fallbackEmail = rawInput.includes('@')
      ? rawInput.trim().toLowerCase()
      : `${rawInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')}@shodhini.app`;

    const fallbackRes = await supabase.auth.signInWithPassword({
      email: fallbackEmail,
      password: cleanPass,
    });

    if (!fallbackRes.error) {
      authData = fallbackRes.data;
      authError = null;
    }
  }

  if (authError) {
    if (authError.message?.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'Account verification is required. Please check Supabase Auth settings.'
      );
    }
    if (authError.message?.toLowerCase().includes('invalid login credentials')) {
      throw new Error('Invalid phone number or password. Please verify your credentials.');
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
  geoAccuracyM = null,
  geoCapturedAt = null,
  geoSource = null,
  aiAnalysis = null,
  imageBase64 = null,
  requiresAdminVerification = false,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('Your session has expired or is invalid. Please log out and log in again.');
  }

  const activeUserId = session.user.id;

  // Build structured description with AI details and optional user text
  const userText = (description || '').trim();
  let fullDescription = userText;

  if (aiAnalysis) {
    const headerPrefix = `[AI VERIFIED WASTE]`;

    const aiReport = [
      headerPrefix,
      userText ? `User Notes: ${userText}` : null,
    ].filter(Boolean).join('\n');

    fullDescription = aiReport;
  } else if (!userText) {
    fullDescription = `${category || 'Roadside waste'} reported at live geotag location.`;
  }

  // Find GCs in the same ward to build the assignment queue
  let gcQueue = [];
  try {
    const { data: workers } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'WORKER')
      .eq('area_id', areaId);
    if (workers && workers.length > 0) {
      gcQueue = workers.map(w => w.id);
    }
  } catch (err) {
    console.warn('Could not fetch GC queue', err);
  }

  // Attempt insert with core schema fields guaranteed to succeed
  const insertPayload = {
    citizen_id: activeUserId,
    area_id: parseInt(areaId, 10) || 1,
    category: category || 'Roadside waste',
    description: fullDescription,
    latitude,
    longitude,
    geo_lat: latitude,
    geo_lng: longitude,
    geo_accuracy_m: geoAccuracyM,
    geo_captured_at: geoCapturedAt,
    geo_source: geoSource,
    gc_queue: gcQueue,
    assigned_worker_id: gcQueue.length > 0 ? gcQueue[0] : null,
    assigned_at: gcQueue.length > 0 ? new Date().toISOString() : null,
    status: gcQueue.length > 0 ? 'Pending GC' : 'Submitted',
    citizen_image_base64: imageBase64,
  };

  let data, error;
  const res = await supabase.from('complaints').insert(insertPayload).select().single();
  data = res.data;
  error = res.error;

  if (error) {
    console.warn('Initial insert failed, attempting fallback for older schema or constraint violation:', error.message);
    const fallbackPayload = {
      citizen_id: activeUserId,
      area_id: parseInt(areaId, 10) || 1,
      category: category || 'Roadside waste',
      description: fullDescription,
      latitude,
      longitude,
      status: 'Submitted',
    };
    if (imageBase64) fallbackPayload.citizen_image_base64 = imageBase64;
    
    const fallbackRes = await supabase.from('complaints').insert(fallbackPayload).select().single();
    data = fallbackRes.data;
    
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || 'Failed to file complaint.');
    }
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
        'id, citizen_id, area_id, category, description, latitude, longitude, status, assigned_worker_id, eco_points, created_at, gc_queue, assigned_at, accepted_at, sla_warning_issued, areas(name)'
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
        formatWardName(c.area_id, c.areas?.name) +
        (c.latitude && c.longitude
          ? ` | ${c.latitude.toFixed(4)}° N, ${c.longitude.toFixed(4)}° E`
          : ''),
    }));
  } catch (e) {
    console.error('Error in getUserComplaints:', e);
    return [];
  }
}

/**
 * Fetch total eco points for a user (citizens only)
 */
export async function getUserEcoPoints(userId) {
  if (!userId) return 0;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('eco_points, role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data || data.role === 'worker') {
      return 0;
    }

    return data?.eco_points || 0;
  } catch (e) {
    console.warn('Error in getUserEcoPoints:', e);
    return 0;
  }
}

/**
 * Update (add or deduct) eco points for a user
 */
export async function updateUserEcoPoints(userId, deltaPoints) {
  if (!userId) return 0;
  try {
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('eco_points')
      .eq('id', userId)
      .maybeSingle();

    if (fetchErr || !profile) return 0;

    let newPoints = (profile.eco_points || 0) + deltaPoints;
    if (newPoints < 0) newPoints = 0;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ eco_points: newPoints })
      .eq('id', userId);

    if (updateErr) {
      console.warn('Error updating eco points:', updateErr.message);
      return profile.eco_points || 0;
    }
    
    return newPoints;
  } catch (e) {
    console.warn('Exception in updateUserEcoPoints:', e);
    return 0;
  }
}

/**
 * Fetch real registered citizens for the community leaderboard
 */
export async function getCitizenLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, area_id, eco_points, areas(name)')
      .eq('role', 'citizen')
      .order('eco_points', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Error fetching citizen leaderboard:', error.message);
      return [];
    }

    return (data || []).map((p, idx) => ({
      id: p.id,
      rank: idx + 1,
      name: p.name || 'Citizen',
      ward: formatWardName(p.area_id, p.areas?.name),
      points: Number(p.eco_points || 0),
    }));
  } catch (e) {
    console.warn('Leaderboard fetch exception:', e);
    return [];
  }
}

/**
 * Fetch real ward cleanliness rankings from active & resolved complaints (Assagao Village - 7 Wards)
 */
export async function getWardLeaderboard() {
  try {
    // 1. Fetch all Assagao wards
    const areasList = await getAreas();

    // 2. Fetch all complaints to compute actual cleanups
    const { data: complaintsData, error: cErr } = await supabase
      .from('complaints')
      .select('id, area_id, status');

    const complaints = complaintsData || [];
    const wardMap = {};

    areasList.forEach((a) => {
      wardMap[a.id] = {
        id: a.id,
        name: a.name,
        total: 0,
        resolved: 0,
      };
    });

    complaints.forEach((c) => {
      if (c.area_id && wardMap[c.area_id]) {
        wardMap[c.area_id].total += 1;
        if (c.status === 'Completed') {
          wardMap[c.area_id].resolved += 1;
        }
      }
    });

    const list = Object.values(wardMap).map((w) => {
      const score = w.total > 0 ? Math.round((w.resolved / w.total) * 100) : 100;
      return {
        id: w.id,
        name: w.name,
        resolved: w.resolved,
        total: w.total,
        score,
        active: w.total - w.resolved,
      };
    });

    // Sort by resolved desc, then highest cleanliness score desc
    list.sort((a, b) => b.resolved - a.resolved || b.score - a.score || a.id - b.id);

    return list.map((w, idx) => ({
      ...w,
      rank: idx + 1,
    }));
  } catch (e) {
    console.warn('Ward leaderboard fetch exception:', e);
    return [];
  }
}

/**
 * Fetch cleanup stats for a worker
 */
export async function getCollectorCleanupStats(workerId, areaId) {
  try {
    let query = supabase.from('complaints').select('id, status');
    if (workerId) {
      query = query.or(`assigned_worker_id.eq.${workerId},area_id.eq.${areaId || 0}`);
    } else if (areaId) {
      query = query.eq('area_id', areaId);
    }
    const { data } = await query;
    const list = data || [];
    const completed = list.filter((c) => c.status === 'Completed').length;
    const active = list.filter((c) => c.status !== 'Completed').length;
    return { completed, active };
  } catch (e) {
    return { completed: 0, active: 0 };
  }
}

/**
 * Fetch a single complaint's details (including base64 images)
 */
export async function getComplaintDetails(complaintId) {
  if (!complaintId) return null;
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*, areas(name), profiles:citizen_id(name, phone)')
      .eq('id', complaintId)
      .single();

    if (error) {
      console.error('Error fetching complaint details:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Exception in getComplaintDetails:', e);
    return null;
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
        'id, citizen_id, area_id, category, description, latitude, longitude, status, assigned_worker_id, eco_points, created_at, gc_queue, assigned_at, accepted_at, sla_warning_issued, areas(name), profiles:citizen_id(name, phone)'
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
        formatWardName(c.area_id, c.areas?.name) +
        (c.latitude && c.longitude
          ? ` | ${c.latitude.toFixed(4)}° N, ${c.longitude.toFixed(4)}° E`
          : ''),
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
export async function updateComplaintStatus({ complaintId, status, workerId, collectorImageBase64 = null, resolvedAt = null, collectorLatitude = null, collectorLongitude = null }) {
  // Check the old status and get citizen_id
  const { data: oldData } = await supabase
    .from('complaints')
    .select('status, citizen_id, eco_points')
    .eq('id', complaintId)
    .single();

  const updatePayload = { status };
  if (workerId) {
    updatePayload.assigned_worker_id = workerId;
  }
  if (status === 'In Progress') {
    updatePayload.accepted_at = new Date().toISOString();
  }
  if (collectorImageBase64) {
    updatePayload.collector_image_base64 = collectorImageBase64;
  }
  if (resolvedAt) {
    updatePayload.resolved_at = resolvedAt;
  }
  if (collectorLatitude !== null) {
    updatePayload.collector_latitude = collectorLatitude;
  }
  if (collectorLongitude !== null) {
    updatePayload.collector_longitude = collectorLongitude;
  }

  // Award points if transitioning to Completed
  let pointsAwarded = 0;
  if (status === 'Completed' && oldData?.status !== 'Completed' && !oldData?.eco_points) {
    updatePayload.eco_points = 15;
    pointsAwarded = 15;
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

  // If points were awarded, update the citizen's profile
  if (pointsAwarded > 0 && oldData?.citizen_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('eco_points')
      .eq('id', oldData.citizen_id)
      .single();
    
    if (profile) {
      await supabase
        .from('profiles')
        .update({ eco_points: (profile.eco_points || 0) + pointsAwarded })
        .eq('id', oldData.citizen_id);
    }
  }

  return data;
}

/**
 * Reject a complaint (GC action) or Timeout - Pass to next GC
 */
export async function rejectComplaint({ complaintId, reason = 'Timeout', currentQueue = [] }) {
  const queueToUse = Array.isArray(currentQueue) ? currentQueue : [];
  const newQueue = [...queueToUse].slice(1);
  const nextWorker = newQueue.length > 0 ? newQueue[0] : null;

  const updatePayload = {
    gc_queue: newQueue,
    assigned_worker_id: nextWorker,
    assigned_at: nextWorker ? new Date().toISOString() : null,
    status: nextWorker ? 'Pending GC' : 'Submitted',
    rejection_reason: reason,
  };

  let { data, error } = await supabase
    .from('complaints')
    .update(updatePayload)
    .eq('id', complaintId)
    .select()
    .single();

  if (error) {
    console.warn('Initial reject update failed, attempting fallback (constraint violation):', error.message);
    const fallbackPayload = {
      status: 'Submitted',
      rejection_reason: reason,
    };
    const fallbackRes = await supabase
      .from('complaints')
      .update(fallbackPayload)
      .eq('id', complaintId)
      .select()
      .single();
    
    data = fallbackRes.data;
    if (fallbackRes.error) {
      throw new Error(fallbackRes.error.message || 'Failed to reject complaint.');
    }
  }

  return data;
}

/**
 * Mark SLA Warning Issued
 */
export async function markSlaWarningIssued(complaintId) {
  await supabase
    .from('complaints')
    .update({ sla_warning_issued: true })
    .eq('id', complaintId);
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

