import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let query = supabase
      .from('inventory')
      .select(`
        *,
        products (*)
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`products.name.ilike.%${search}%,products.code.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('inventory')
      .insert([body])
      .select()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Error creating inventory:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory' },
      { status: 500 }
    )
  }
}
