import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      )
    }

    const customerData = {
      ...body,
      is_active: body.is_active !== false,
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
