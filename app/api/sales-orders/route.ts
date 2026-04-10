import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    let query = supabase
      .from('sales_orders')
      .select(`
        *,
        customers (*),
        created_by: users(id, email, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customers.name.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sales orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales orders' },
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
    if (!body.order_number || !body.customer_id) {
      return NextResponse.json(
        { error: 'Order number and customer ID are required' },
        { status: 400 }
      )
    }

    const orderData = {
      ...body,
      created_by: user.id,
      status: body.status || 'draft',
    }

    const { data, error } = await supabase
      .from('sales_orders')
      .insert([orderData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating sales order:', error)
    return NextResponse.json(
      { error: 'Failed to create sales order' },
      { status: 500 }
    )
  }
}
