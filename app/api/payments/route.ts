import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoice_id')
    const status = searchParams.get('status')

    let query = supabase
      .from('payments')
      .select(`
        *,
        invoices (*),
        recorded_by: users(id, email, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!body.invoice_id || !body.amount) {
      return NextResponse.json(
        { error: 'Invoice ID and amount are required' },
        { status: 400 }
      )
    }

    const paymentData = {
      ...body,
      recorded_by: user.id,
      status: body.status || 'pending',
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
