import { requireSupabase } from './supabaseClient.js'

export const REQUIRED_TERMS = ['terms_of_service', 'privacy_policy']
export const OPTIONAL_TERMS = ['marketing']

export const TERMS_VERSIONS = {
  terms_of_service: '2026-07-23',
  privacy_policy: '2026-07-23',
  marketing: '2026-07-23',
}

export async function loadAcceptedTermsVersions(userId) {
  const { data, error } = await requireSupabase()
    .from('terms_acceptances')
    .select('terms_type, terms_version')
    .eq('user_id', userId)
  if (error) throw error
  return new Set((data || []).map((row) => `${row.terms_type}:${row.terms_version}`))
}

export function hasAcceptedRequiredTerms(acceptedSet) {
  return REQUIRED_TERMS.every((type) => acceptedSet.has(`${type}:${TERMS_VERSIONS[type]}`))
}

export async function recordTermsAcceptance(userId, termTypes, source = 'onboarding_web') {
  if (!termTypes.length) return
  const rows = termTypes.map((type) => ({
    user_id: userId,
    terms_type: type,
    terms_version: TERMS_VERSIONS[type],
    source,
  }))
  const { error } = await requireSupabase()
    .from('terms_acceptances')
    .upsert(rows, { onConflict: 'user_id,terms_type,terms_version', ignoreDuplicates: true })
  if (error) throw error
}
