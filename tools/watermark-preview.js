#!/usr/bin/env node
/**
 * Tags a streaming preview MP3 with a repeating audio watermark before you
 * upload it in the admin panel (Upload → "Streaming preview" field).
 *
 * Why this is a separate local script and not part of the website: Supabase
 * Edge Functions run on Deno without ffmpeg available, so audio mixing has
 * to happen before the file reaches the site. This runs on your own
 * machine (Windows/Mac/Linux) with Node + ffmpeg installed.
 *
 * Usage:
 *   node tools/watermark-preview.js <input.mp3> <tag.mp3> [output.mp3]
 *
 * Example:
 *   node tools/watermark-preview.js beats/blood-moon-full.mp3 tools/dmp-tag.mp3 beats/blood-moon-preview.mp3
 *
 * What it does:
 *   - Loops your voice tag (e.g. "Deepmusicpro") quietly under the beat
 *     every ~8 seconds, mixed well below the beat's volume
 *   - Exports an MP3 ready to upload as the public streaming preview
 *
 * Requirements:
 *   - Node.js 18+
 *   - ffmpeg installed and on your PATH (https://ffmpeg.org/download.html)
 *   - A short tag audio clip (tools/dmp-tag.mp3 is NOT included — record or
 *     generate a 1-2 second "Deepmusicpro" drop and put it wherever you like)
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const [, , input, tag, outputArg] = process.argv

if (!input || !tag) {
  console.error('Usage: node tools/watermark-preview.js <input.mp3> <tag.mp3> [output.mp3]')
  process.exit(1)
}
if (!existsSync(input)) {
  console.error(`Input file not found: ${input}`)
  process.exit(1)
}
if (!existsSync(tag)) {
  console.error(`Tag file not found: ${tag}`)
  process.exit(1)
}

const output = outputArg || path.join(
  path.dirname(input),
  path.basename(input, path.extname(input)) + '-preview.mp3'
)

// Loops the tag clip continuously at low volume (-18dB under the beat),
// mixes it in, and trims to the first 60s (typical preview length —
// change "-t 60" or remove it for full-length watermarked previews).
const filter =
  '[1:a]aloop=loop=-1:size=2e9,volume=0.22[tag];' +
  '[0:a][tag]amix=inputs=2:duration=first:dropout_transition=0[out]'

const args = [
  '-y',
  '-i', input,
  '-stream_loop', '-1', '-i', tag,
  '-filter_complex', filter,
  '-map', '[out]',
  '-t', '60',
  '-codec:a', 'libmp3lame', '-q:a', '4',
  output,
]

console.log('Running ffmpeg...')
try {
  execFileSync('ffmpeg', args, { stdio: 'inherit' })
  console.log(`\nDone: ${output}`)
  console.log('Upload this file as the "Streaming preview" in /admin/upload.')
} catch (err) {
  console.error('\nffmpeg failed — make sure it is installed and on your PATH.')
  process.exit(1)
}
