import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationStaff } from '@/lib/auth-server';
import { isFilterSafeEmail, readJsonObject } from '@/lib/security';
import { isFee, MAX_FEE, ON_SPOT_PHASE } from '@/lib/seats';

export const runtime = 'nodejs';

// No time limit in practice: the grant is given in person at the desk and lasts until it is used. The columns are
// NOT NULL, so this is just a long way off.
const VALID_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * POST /api/admin/registrations/on-spot  { email, amount }
 * Registration-Team/Admin only. ALLOW ON-SPOT: a walk-in at the college desk. There is no public on-spot page and no
 * switch: only the account staff name here may register, at `amount`, with no accommodation and no registration kit.
 * Staff only do this for someone standing at the desk, so the desk is the location check. It doesn't create a
 * registration: the student fills in the usual form, pays and submits their proof, and it is reviewed as usual
 * (approve only once the UTR and amount are on the bank statement). Granting the same email again replaces the grant.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyRegistrationStaff(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await readJsonObject(req);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    const { email, amount } = parsed.value;

    const normalized = typeof email === 'string' ? email.toLowerCase().trim() : '';
    if (!normalized || !isFilterSafeEmail(normalized)) {
      return NextResponse.json({ error: 'Enter the email address the student signs in with.' }, { status: 400 });
    }
    if (!isFee(amount)) {
      return NextResponse.json({ error: `The fee must be a whole number of rupees from 1 to ${MAX_FEE}.` }, { status: 400 });
    }

    const { supabase, user } = auth;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalized)
      .maybeSingle();
    if (profileError) {
      console.error('/api/admin/registrations/on-spot profile lookup failed:', profileError);
      return NextResponse.json({ error: 'Database operation failed.' }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json(
        { error: 'No account with that email. Ask the student to sign in on the site once, then try again.' },
        { status: 404 }
      );
    }
    if (profile.id === user.id) {
      return NextResponse.json({ error: 'You cannot allow yourself. Ask another staff member.' }, { status: 403 });
    }

    const { data: active, error: activeError } = await supabase
      .from('registrations')
      .select('registration_id')
      .eq('user_id', profile.id)
      .neq('status', 'rejected')
      .limit(1)
      .maybeSingle();
    if (activeError) {
      console.error('/api/admin/registrations/on-spot registration lookup failed:', activeError);
      return NextResponse.json({ error: 'Database operation failed.' }, { status: 500 });
    }
    if (active) {
      return NextResponse.json({ error: `This student already has registration ${active.registration_id}.` }, { status: 409 });
    }

    // Only one pass counts at a time: the newest.
    const now = new Date();
    const { error: retireError } = await supabase
      .from('payment_passes')
      .update({ used_at: now.toISOString() })
      .eq('user_id', profile.id)
      .is('used_at', null);
    if (retireError) {
      console.error('/api/admin/registrations/on-spot retire failed:', retireError);
      return NextResponse.json({ error: 'Database operation failed.' }, { status: 500 });
    }
    // pay_by in the future: the form shows the payment details at this fee. accommodation false: on-spot never has it.
    const until = new Date(now.getTime() + VALID_FOR_MS).toISOString();
    const { error: insertError } = await supabase.from('payment_passes').insert({
      user_id: profile.id,
      phase: ON_SPOT_PHASE,
      amount,
      pay_by: until,
      submit_by: until,
      issued_by: user.id,
      note: 'on-spot',
      accommodation: false,
    });
    if (insertError) {
      console.error('/api/admin/registrations/on-spot insert failed:', insertError);
      return NextResponse.json({ error: 'Database operation failed.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('/api/admin/registrations/on-spot error:', err);
    return NextResponse.json({ error: 'Failed to allow on-spot registration.' }, { status: 500 });
  }
}
