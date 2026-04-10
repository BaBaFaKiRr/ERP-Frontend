import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers (*),
        created_by: users(id, email, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`po_number.ilike.%${search}%,suppliers.name.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
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
    if (!body.po_number || !body.supplier_id) {
      return NextResponse.json(
        { error: 'PO number and supplier ID are required' },
        { status: 400 }
      )
    }

    const poData = {
      ...body,
      created_by: user.id,
      status: body.status || 'draft',
    }

    const { data, error } = await supabase
      .from('purchase_orders')
      .insert([poData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
