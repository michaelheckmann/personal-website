/**
 * Curated Krea asset IDs for the website gallery.
 *
 * Keep only the asset IDs that should appear on the site.
 * The order in this array controls the order in src/assets/gallery.json.
 *
 * To update this list:
 * 1. Open https://www.krea.ai/assets
 * 2. Open browser DevTools and go to the Network tab
 * 3. Reload the page and inspect the /api/assets/folders request
 * 4. Find the "Gallery" folder in the response and copy the asset_ids you want
 * 5. Paste them into CURATED_GALLERY_ASSET_IDS below
 */
export const CURATED_GALLERY_ASSET_IDS = [
  "de089398-3266-415c-8b88-e08d21ebecae",
  "37338336-b954-4919-9526-59f946cd171d",
  "76a0b96d-2777-4417-a54a-de0fcbf357a8",
  "82757e37-8695-475a-bc6c-cf10e024ec2d",
  "0f2bbe1e-679c-4833-826e-8c8f83bcced8",
  "4686e2a9-8083-4b0b-b55d-e93451e06ab6",
  "e1da6cc7-9333-415d-b5d9-16b435d7ba10",
  "24efafb8-3798-416e-b048-5d84a55c21d1",
  "2d92815c-51e6-468a-ab2a-3f69b892ecc6",
  "ae1b841c-bdbc-4dae-9dca-740b2ecbf1bb",
  "5eb57e67-9829-4489-be63-4b6472ca8163",
  "03aa6ba9-4774-4a84-bf59-47166083b72e",
  "cd4ebbfb-8b37-49a1-8991-84468763f862",
  "84c5ac26-2d7e-41a1-a8d4-a5bca765d5c3",
  "0741b004-2568-4a4b-892e-e26b15171d6e",
  "8e89a0b7-92d5-4d09-8795-95f1c0cb3c0a",
  "fbe1337b-d7d3-400a-b1ca-51ec7d114ee3",
  "6d563789-8065-4e58-b914-430ec7caf899",
  "bb18df2c-bfd9-493e-93ef-c9ac32d79428",
  "58714ab6-5989-4729-af1b-9943063366b2",
  "d7b468e9-86be-43da-b0e9-fc351a09d50a",
  "0453a1bc-31f3-48aa-a8fd-73d8c4131c6b",
  "6fa885d7-4c50-488d-8879-9be5c25b5468",
  "0f942ae9-9fa4-45c5-b2c3-55bd9e80273a",
  "8a3767e2-2c1f-49d4-9b2f-11cc9aeee226",
  "6b66e0ff-5fe2-4f82-a390-a576fbad3c12",
  "3c27bfb2-df5d-4a34-abec-b61b944a2767",
] as const;
