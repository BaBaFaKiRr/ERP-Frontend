import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    let query = supabase
      .from('work_orders')
      .select(`
        *,
        sales_orders (*),
        assigned_to: users(id, email, first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`wo_number.ilike.%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch work orders' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    if (!body.wo_number) {
      return NextResponse.json(
        { error: 'Work order number is required' },
        { status: 400 }
      )
    }

    const woData = {
      ...body,
      status: body.status || 'pending',
    }

    const { data, error } = await supabase
      .from('work_orders')
      .insert([woData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating work order:', error)
    return NextResponse.json(
      { error: 'Failed to create work order' },
      { status: 500 }
    )
  }
}
