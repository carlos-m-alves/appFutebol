import { supabase } from '../lib/supabase'

const AVATAR_BUCKET = 'img'
const AVATAR_FOLDER = 'img'
const MAX_FILE_SIZE = 1 * 1024 * 1024

export async function uploadAvatar(file: File, profileId: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('A imagem deve ter no máximo 1MB')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${AVATAR_FOLDER}/${profileId}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = await supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}

export async function uploadGroupImage(file: File, groupId: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('A imagem deve ter no máximo 1MB')
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${AVATAR_FOLDER}/groups/${groupId}/image.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, { upsert: true })

  if (uploadError) throw uploadError

  const { data: urlData } = await supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(filePath)

  return urlData.publicUrl
}
