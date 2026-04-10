import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabase
      .from('suppliers')
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
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
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
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

    const supplierData = {
      ...body,
      is_active: body.is_active !== false,
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplierData])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
