-- Reclasser les intitulés explicites sans modifier les identifiants, favoris,
-- statuts, dates ni familles des postes qui citent ce métier en description.
UPDATE job_offers
SET universe = 'COMMERCE', "jobFamily" = 'CATEGORY_MANAGER', specialty = 'AUTRE'
WHERE lower(translate(title, 'ÉÈÊéèê', 'EEEeee'))
  ~ '\m(category[ -]+(managers?|management|leads?)|categorie[ -]+managers?|(chefs?|cheffes?|responsables?|gestionnaires?|managers?)[ -]+de[ -]+categories?)\M';
