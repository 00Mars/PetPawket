// routes/searchRoutes.js — unified search over Pets, Journal, and Products
import express from 'express';
import fetch from 'node-fetch';
import { attachAuthIfPresent } from '../middleware/requireAuth.js';
import { ensureUser, getPetsByUserId, getPetJournal } from '../userDB.pg.js';

const router = express.Router();

// Shopify config
const SHOPIFY_DOMAIN = (process.env.SHOPIFY_DOMAIN || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN || '';
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-07';
const SF_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;
const HAS_SHOPIFY_SEARCH = Boolean(SHOPIFY_DOMAIN && STOREFRONT_TOKEN);

async function shopifyGQL(query, variables) {
  const res = await fetch(SF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json?.errors) throw new Error('Shopify search error');
  return json;
}

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) return res.json({ pets: [], journal: [], products: [] });
    const productLimit = Math.min(Math.max(parseInt(req.query.limit || '8', 10) || 8, 1), 12);

    let pets = [];
    let journal = [];
    const signedIn = await attachAuthIfPresent(req);
    if (signedIn && req.customer?.email) {
      const c = req.customer;
      const u = req.dbUser || await ensureUser(c.email, c.firstName || '', c.lastName || '');
      const userId = u?.id;

      // Pets
      const allPets = userId ? await getPetsByUserId(userId) : [];
      pets = allPets.filter(p => {
        const hay = [p.name, p.species, p.breed].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });

      // Journal (search across all pets if pet match was empty)
      const basePets = pets.length ? pets : allPets;
      for (const p of basePets) {
        const entries = await getPetJournal(userId, p.id);
        for (const e of entries) {
          const hay = [
            e.text,
            e.mood,
            ...(Array.isArray(e.tags) ? e.tags : []),
          ].filter(Boolean).join(' ').toLowerCase();
          if (hay.includes(q)) journal.push({ ...e, petId: p.id, petName: p.name });
        }
      }
    }

    // Products (public)
    let products = [];
    if (HAS_SHOPIFY_SEARCH) try {
      const gql = /* GraphQL */ `
        query Search($first:Int!, $query:String!) {
          products(first:$first, query:$query) {
            edges {
              node {
                id
                handle
                title
                featuredImage { url altText }
                priceRange {
                  minVariantPrice { amount currencyCode }
                  maxVariantPrice { amount currencyCode }
                }
                availableForSale
              }
            }
          }
        }
      `;
      const data = await shopifyGQL(gql, { first: productLimit, query: q });
      products = (data?.data?.products?.edges || []).map(e => e.node);
    } catch (prodErr) {
      console.warn('[search] product subsearch failed (non-fatal):', prodErr?.message);
    }

    res.json({ pets, journal, products });
  } catch (e) {
    console.error('GET /api/search error:', e);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
