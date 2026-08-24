// Browser-only shell of the i18n module — adapted for Next.js (no import.meta.glob).

import { useSyncExternalStore } from 'react'
import {
  LANGS, INSTR_LANGS, DATE_LOCALES,
  getLang, dateLocale, t, instrFor, getVersion, _setLangState
} from './i18n-core.js'

export { LANGS, INSTR_LANGS, DATE_LOCALES, getLang, dateLocale, t, instrFor }

const localeLoaders = {
  de: () => import('../locales/de.js'),
  es: () => import('../locales/es.js'),
  fr: () => import('../locales/fr.js'),
  hi: () => import('../locales/hi.js'),
  it: () => import('../locales/it.js'),
  ko: () => import('../locales/ko.js'),
  pl: () => import('../locales/pl.js'),
  pt: () => import('../locales/pt.js'),
  ru: () => import('../locales/ru.js'),
  tr: () => import('../locales/tr.js'),
  zh: () => import('../locales/zh.js'),
}

const instrLoaders = {
  es: () => import('../instr/es.js'),
  fr: () => import('../instr/fr.js'),
  hi: () => import('../instr/hi.js'),
  it: () => import('../instr/it.js'),
  ko: () => import('../instr/ko.js'),
  pl: () => import('../instr/pl.js'),
  ru: () => import('../instr/ru.js'),
  tr: () => import('../instr/tr.js'),
  zh: () => import('../instr/zh.js'),
}

const subs = new Set()
const notify = () => { subs.forEach(f => f()) }

export async function setLang(l) {
  if (!LANGS[l]) l = 'en'
  if (l === getLang() && getVersion() > 0) return
  let dict = {}, instr = null
  try {
    dict = l === 'en' || !localeLoaders[l] ? {} : (await localeLoaders[l]()).default
    instr = l === 'en' || !INSTR_LANGS.includes(l) || !instrLoaders[l]
      ? null
      : (await instrLoaders[l]()).default
  } catch {
    dict = {}
    instr = null
  }
  _setLangState(l, dict, instr)
  notify()
}

export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, getVersion)
}
