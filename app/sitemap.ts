import type {MetadataRoute} from 'next';
import {SITE_URL} from '@/lib/site';
import {EPISODES} from '@/lib/events/catalog';
export default function sitemap():MetadataRoute.Sitemap{return ['','/about','/events','/shop','/join','/askusanything','/legal','/privacy','/terms','/cookies',...EPISODES.map(episode=>`/${episode.slug}`)].map(path=>({url:SITE_URL+path+(path?'':'/')}));}
