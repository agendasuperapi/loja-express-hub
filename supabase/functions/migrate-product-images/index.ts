import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Iniciando migração de imagens de produtos...')

    // Buscar todos os produtos com imagens em temp
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, image_url, name')
      .ilike('image_url', '%/temp/%')

    if (productsError) {
      throw new Error(`Erro ao buscar produtos: ${productsError.message}`)
    }

    console.log(`Encontrados ${products?.length || 0} produtos com imagens em temp`)

    const results = {
      success: [] as string[],
      errors: [] as { productId: string; error: string }[]
    }

    for (const product of products || []) {
      try {
        console.log(`Processando produto ${product.id} - ${product.name}`)
        
        // Extrair o caminho atual da imagem
        const currentUrl = product.image_url
        const urlParts = new URL(currentUrl)
        const pathParts = urlParts.pathname.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const oldPath = `temp/${fileName}`
        const newPath = `${product.id}.jpg`

        console.log(`Movendo de ${oldPath} para ${newPath}`)

        // Baixar a imagem atual
        const { data: imageData, error: downloadError } = await supabase
          .storage
          .from('product-images')
          .download(oldPath)

        if (downloadError) {
          throw new Error(`Erro ao baixar imagem: ${downloadError.message}`)
        }

        console.log(`Imagem baixada, tamanho: ${imageData.size} bytes`)

        // Fazer upload da imagem com o novo nome
        const { error: uploadError } = await supabase
          .storage
          .from('product-images')
          .upload(newPath, imageData, {
            contentType: 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
        }

        console.log(`Upload concluído para ${newPath}`)

        // Atualizar a URL no banco de dados
        const newImageUrl = `${supabaseUrl}/storage/v1/object/public/product-images/${newPath}`
        
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: newImageUrl })
          .eq('id', product.id)

        if (updateError) {
          throw new Error(`Erro ao atualizar banco: ${updateError.message}`)
        }

        console.log(`Banco de dados atualizado para produto ${product.id}`)

        // Deletar a imagem antiga
        const { error: deleteError } = await supabase
          .storage
          .from('product-images')
          .remove([oldPath])

        if (deleteError) {
          console.warn(`Aviso: Não foi possível deletar imagem antiga: ${deleteError.message}`)
        }

        results.success.push(product.id)
        console.log(`✅ Produto ${product.id} migrado com sucesso`)

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error(`❌ Erro ao migrar produto ${product.id}:`, errorMsg)
        results.errors.push({
          productId: product.id,
          error: errorMsg
        })
      }
    }

    console.log('Migração concluída!')
    console.log(`Sucessos: ${results.success.length}`)
    console.log(`Erros: ${results.errors.length}`)

    return new Response(
      JSON.stringify({
        message: 'Migração concluída',
        total: products?.length || 0,
        success: results.success.length,
        errors: results.errors.length,
        details: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Erro na migração:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao migrar imagens', 
        details: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
