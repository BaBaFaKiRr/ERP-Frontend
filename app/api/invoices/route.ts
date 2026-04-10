import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers (*),
        suppliers (*),
        sales_orders (*),
        purchase_orders (*)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('invoice_number', `%${search}%`)
    }

    if (type) {
      query = query.eq('invoice_type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
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
    if (!body.invoice_number || !body.invoice_type) {
      return NextResponse.json(
        { error: 'Invoice number and type are required' },
        { status: 400 }
      )
    }

    const invoiceData = {
      ...body,
      created_by: user.id,
      status: body.status || 'draft',
    }

    const { data, error } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
