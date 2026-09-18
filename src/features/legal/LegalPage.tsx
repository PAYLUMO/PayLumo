import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Pages légales — modèles à FAIRE RELIRE PAR UN JURISTE avant diffusion publique.
 * Les mentions `<Todo>` marquent ce que l'éditeur doit renseigner (identité,
 * e-mail de contact, durée de conservation des journaux, médiateur…).
 */

const UPDATED = '[À COMPLÉTER : date]';

function Todo({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded bg-amber-200 px-1 text-amber-950 dark:bg-amber-500/30 dark:text-amber-100">
      [{children}]
    </mark>
  );
}

function LegalDoc({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft size={15} /> Accueil
      </Link>
      <h1 className="mt-3 text-xl font-extrabold sm:text-2xl">{title}</h1>
      <p className="mt-1 text-xs text-muted">Dernière mise à jour : {UPDATED}</p>

      <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-y border-[rgb(var(--border))] py-2 text-xs">
        <Link to="/mentions-legales" className="hover:underline">
          Mentions légales
        </Link>
        <Link to="/confidentialite" className="hover:underline">
          Confidentialité
        </Link>
        <Link to="/conditions" className="hover:underline">
          Conditions d’utilisation
        </Link>
      </nav>

      <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted [&_a]:text-brand-700 [&_a]:underline dark:[&_a]:text-brand-300 [&_h2]:mb-1 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-[rgb(var(--text))] [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-[rgb(var(--text))] [&_li]:mt-1 [&_p]:mt-2 [&_strong]:text-[rgb(var(--text))] [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function MentionsLegales() {
  return (
    <LegalDoc title="Mentions légales">
      <h2>Éditeur</h2>
      <p>
        Le présent service, « PayLumo », est édité par <Todo>À COMPLÉTER : nom ou dénomination
        sociale</Todo>, <Todo>forme juridique</Todo>
        {' '}au capital de <Todo>montant</Todo>, immatriculée au RCS de <Todo>ville</Todo> sous le
        numéro <Todo>SIREN</Todo>, dont le siège est situé <Todo>adresse complète</Todo>.
      </p>
      <p>
        Numéro de TVA intracommunautaire : <Todo>si applicable</Todo>.
      </p>
      <p>
        Pour un éditeur particulier (non professionnel) : <Todo>nom, prénom et adresse
        e-mail</Todo>.
      </p>

      <h2>Directeur de la publication</h2>
      <p>
        <Todo>À COMPLÉTER : nom du directeur ou de la directrice de la publication</Todo>.
      </p>

      <h2>Contact</h2>
      <p>
        Par courriel : <Todo>À COMPLÉTER : adresse e-mail de contact</Todo>.
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut, CA
        91789, États-Unis — <a href="https://vercel.com">vercel.com</a>.
      </p>
      <p>
        La lecture des bulletins fait appel à l’API de <strong>Anthropic, PBC</strong>, 548 Market
        Street, PMB 90375, San Francisco, CA 94104, États-Unis.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque « PayLumo », son logo, l’interface, les textes explicatifs et le code source sont
        la propriété de l’éditeur ou font l’objet d’une licence. Toute reproduction ou réutilisation
        sans autorisation est interdite.
      </p>
      <p>
        Les barèmes, taux et seuils cités sont issus de sources publiques (Bulletin officiel de la
        Sécurité sociale, URSSAF, Agirc-Arrco) et n’engagent pas ces organismes.
      </p>

      <h2>Signalement de contenu illicite</h2>
      <p>
        Tout contenu manifestement illicite peut être signalé à l’adresse de contact indiquée
        ci-dessus (loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique).
      </p>
    </LegalDoc>
  );
}

export function Confidentialite() {
  return (
    <LegalDoc title="Politique de confidentialité">
      <p>
        Cette politique décrit comment PayLumo traite vos données personnelles lorsque vous
        analysez un bulletin de paie. Elle est établie conformément au Règlement général sur la
        protection des données (RGPD) et à la loi « Informatique et Libertés ».
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        <Todo>À COMPLÉTER : identité de l’éditeur</Todo>. Contact pour toute question relative aux
        données : <Todo>adresse e-mail</Todo>.
      </p>

      <h2>Données traitées</h2>
      <ul>
        <li>
          <strong>Le fichier PDF de votre bulletin et son contenu</strong> : période, identité
          (nom, prénom), employeur (raison sociale, SIRET), emploi, statut, rémunération et
          cotisations, et selon votre bulletin, le matricule et le numéro de sécurité sociale.
        </li>
        <li>
          <strong>Données techniques</strong> : adresse IP, horodatage et informations de requête
          (journaux du serveur), utilisées pour la sécurité et la limitation des abus.
        </li>
        <li>
          <strong>Le code d’accès</strong> que vous saisissez, le cas échéant.
        </li>
      </ul>
      <p>
        Vous pouvez masquer votre numéro de sécurité sociale sur le PDF avant de l’importer : il
        n’est pas nécessaire à l’analyse.
      </p>

      <h2>Finalités et bases légales</h2>
      <ul>
        <li>
          <strong>Lire et analyser le bulletin que vous transmettez</strong> — exécution du service
          que vous demandez (article 6.1.b du RGPD). Vous déclenchez vous-même chaque envoi.
        </li>
        <li>
          <strong>Assurer la sécurité du service et prévenir les abus</strong> (limitation du
          nombre de requêtes, détection d’usage automatisé) — intérêt légitime (article 6.1.f).
        </li>
      </ul>

      <h2>Destinataires et sous-traitants</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (États-Unis) — hébergement du site et exécution du
          traitement.
        </li>
        <li>
          <strong>Anthropic, PBC</strong> (États-Unis) — le PDF lui est transmis pour en extraire
          les données. Anthropic agit comme sous-traitant ; dans le cadre de son API, elle ne
          conserve pas le contenu transmis et ne l’utilise pas pour entraîner ses modèles.
        </li>
      </ul>
      <p>
        Aucune autre communication à des tiers. PayLumo ne vend pas de données et n’affiche pas de
        publicité.
      </p>

      <h2>Transferts hors Union européenne</h2>
      <p>
        Vercel et Anthropic sont établies aux États-Unis. Ces transferts sont encadrés par les
        clauses contractuelles types de la Commission européenne et, le cas échéant, par le cadre
        « EU-US Data Privacy Framework ».
      </p>

      <h2>Durée de conservation</h2>
      <ul>
        <li>
          <strong>Le PDF de votre bulletin n’est pas stocké.</strong> Il est traité en mémoire puis
          supprimé immédiatement après l’analyse.
        </li>
        <li>
          <strong>Le résultat de l’analyse</strong> est enregistré uniquement dans votre
          navigateur, sur votre appareil (IndexedDB). Vous pouvez le supprimer à tout moment
          (Réglages → « Effacer toutes mes analyses »).
        </li>
        <li>
          <strong>Les journaux du serveur</strong> (adresse IP, horodatage) sont conservés au
          maximum <Todo>durée, ex. 12 mois</Todo>, à des fins de sécurité, puis supprimés.
        </li>
      </ul>

      <h2>Stockage sur votre appareil</h2>
      <p>
        PayLumo utilise le stockage local de votre navigateur pour : le thème choisi, le code
        d’accès de la session en cours, et l’historique de vos analyses. Il ne s’agit pas de
        cookies publicitaires ; aucune de ces informations n’est transmise à un tiers.{' '}
        <Todo>Aucun outil de mesure d’audience n’est utilisé — à mettre à jour si un tel outil est
        ajouté (une bannière de consentement serait alors requise).</Todo>
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation,
        d’opposition et de portabilité. Le bulletin n’étant pas conservé et le résultat restant sur
        votre appareil, ces droits s’exercent principalement en effaçant vos données depuis
        l’application. Pour toute autre demande : <Todo>adresse e-mail</Todo>.
      </p>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL —{' '}
        <a href="https://www.cnil.fr">cnil.fr</a>.
      </p>

      <h2>Décision automatisée</h2>
      <p>
        L’analyse est purement indicative. Elle ne produit aucune décision produisant des effets
        juridiques à votre égard et ne remplace pas l’avis d’un professionnel.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges sont chiffrés (HTTPS). Le traitement s’effectue en mémoire, sans conservation
        du document.
      </p>

      <h2>Mineurs</h2>
      <p>Le service n’est pas destiné aux personnes de moins de 15 ans.</p>

      <h2>Modifications</h2>
      <p>
        Cette politique peut évoluer. La date de dernière mise à jour figure en haut de page.
      </p>
    </LegalDoc>
  );
}

export function Conditions() {
  return (
    <LegalDoc title="Conditions générales d’utilisation">
      <h2>Objet</h2>
      <p>
        PayLumo est un outil en ligne d’aide à la <strong>lecture</strong> et à la{' '}
        <strong>vérification indicative</strong> des bulletins de paie français, par comparaison
        avec le <strong>barème légal 2026</strong>. L’utilisation du service vaut acceptation des
        présentes conditions.
      </p>

      <h2>Accès au service</h2>
      <p>
        L’accès se fait sans création de compte. <Todo>Le service est gratuit / payant — préciser
        le modèle et, le cas échéant, les prix. Pendant la phase de lancement, un code d’accès peut
        être demandé.</Todo>
      </p>
      <p>
        PayLumo peut limiter, suspendre ou refuser l’accès en cas d’usage abusif : automatisation,
        volume anormal de requêtes, tentative de contournement des limites ou de la sécurité.
      </p>

      <h2>Nature du service — avertissement important</h2>
      <p>
        L’analyse est fournie à titre <strong>purement informatif et pédagogique</strong>. Elle est
        établie automatiquement et&nbsp;:
      </p>
      <ul>
        <li>peut comporter des erreurs (mauvaise lecture du document, cas non couverts) ;</li>
        <li>
          ne compare vos taux et cotisations qu’au <strong>barème légal 2026</strong> : votre{' '}
          <strong>convention collective</strong> peut être renseignée ou détectée pour situer
          l’analyse, mais elle ne modifie aucun calcul — un écart signalé n’est pas nécessairement
          une erreur, il peut s’expliquer par votre convention collective, un{' '}
          <strong>accord d’entreprise</strong> ou votre situation individuelle, que PayLumo ne
          vérifie pas ;
        </li>
      </ul>
      <p>
        Elle <strong>ne constitue pas un conseil</strong> juridique, comptable, fiscal ou social.
        Pour toute décision ou démarche, adressez-vous à votre gestionnaire de paie ou à un
        expert-comptable. L’éditeur ne peut être tenu responsable de l’usage fait de l’analyse ni
        des suites données auprès d’un employeur ou d’un tiers.
      </p>

      <h2>Vos engagements</h2>
      <ul>
        <li>
          n’importer que des bulletins dont vous êtes titulaire ou pour lesquels vous êtes
          autorisé(e) ;
        </li>
        <li>
          ne pas perturber le fonctionnement du service ni tenter d’en extraire les données de
          façon automatisée ;
        </li>
        <li>ne pas utiliser le service à des fins illicites.</li>
      </ul>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque, le logo, l’interface, les contenus explicatifs et le code de PayLumo sont
        protégés. Toute reproduction ou réutilisation non autorisée est interdite.
      </p>

      <h2>Disponibilité</h2>
      <p>
        Le service est fourni « en l’état », sans garantie de disponibilité continue ni d’absence
        d’erreur. Il peut être modifié, interrompu ou arrêté à tout moment.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Dans la limite permise par la loi, la responsabilité de l’éditeur se limite aux dommages
        directs et prévisibles résultant d’une faute qui lui serait imputable.{' '}
        <Todo>Si le service est payant : responsabilité plafonnée au montant payé pour l’analyse
        concernée.</Todo>
      </p>

      <h2>Lancement de l’analyse — caractère définitif</h2>
      <p>
        Chaque analyse déclenche la lecture du bulletin par intelligence artificielle, dont le coût
        est supporté par l’éditeur. Une fois lancée, l’analyse est{' '}
        <strong>due et non remboursable</strong>, quel que soit le résultat obtenu — y compris si le
        bulletin s’avère mal lu ou peu exploitable.{' '}
        <Todo>Si un modèle payant est introduit : préciser ici le prix et les modalités de
        paiement, et rappeler que l’exécution immédiate du service fait perdre le droit de
        rétractation (article L221-28 du code de la consommation).</Todo>
      </p>

      <h2>PDF requis — pas un scan</h2>
      <p>
        PayLumo lit le texte contenu dans le PDF ; il ne lit pas les images. Seul un{' '}
        <strong>PDF natif</strong> (exporté depuis votre espace RH ou votre logiciel de paie)
        fonctionne — une <strong>photo ou un scan</strong> de votre bulletin, même enregistré au
        format PDF, n’est pas analysable et sera facturé comme les autres analyses. Pour vérifier
        avant d’importer : ouvrez le fichier et faites <strong>Ctrl+F</strong> (⌘F sur Mac) — si la
        recherche ne trouve aucun texte, il s’agit d’un scan.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Le traitement de vos données est décrit dans la{' '}
        <Link to="/confidentialite">politique de confidentialité</Link>.
      </p>

      <h2>Droit applicable et litiges</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de différend, une solution
        amiable sera recherchée en priorité. À défaut, les tribunaux français sont compétents.{' '}
        <Todo>Si activité commerciale avec des consommateurs : indiquer le médiateur de la
        consommation compétent (nom et coordonnées) et rappeler la plateforme européenne de
        règlement en ligne des litiges (ec.europa.eu/consumers/odr).</Todo>
      </p>
    </LegalDoc>
  );
}
