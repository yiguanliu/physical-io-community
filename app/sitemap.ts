import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/lib/site';
export default function sitemap():MetadataRoute.Sitemap{return ['','/about','/join','/askusanything','/legal','/privacy','/terms','/cookies'].map(path=>({url:SITE_URL+path+(path?'':'/')}));}
