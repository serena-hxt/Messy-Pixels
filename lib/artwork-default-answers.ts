/**
 * Pre-written default answers for the two AI questions shown on each artwork's
 * digital twin view. These are system-generated and require no API call.
 * Each answer includes two follow-up questions for continued exploration.
 */

export interface DefaultAnswer {
  question: string
  answer: string
  followUps: [string, string]
}

export interface ArtworkDefaults {
  objectid: number
  title: string
  artist: string
  /** Primary questions (2) plus all follow-up answers (up to 8 more per artwork) */
  answers: DefaultAnswer[]
}

/**
 * Scripted conversation branch — a hard-coded sequence that plays automatically
 * without calling the LLM API. Used for specific artworks that warrant guided
 * narrative experiences.
 */
export interface ScriptedBranch {
  triggerId: string // The question that triggers this branch
  objectid: number
  steps: {
    response: string
    nextPrompt?: string // Prompt to show after this response
  }[]
}

export const ARTWORK_DEFAULT_ANSWERS: ArtworkDefaults[] = [
  {
    objectid: 299843,
    title: "Self-Portrait Dedicated to Paul Gauguin",
    artist: "Vincent van Gogh",
    answers: [
      {
        question: `What makes "Self-Portrait Dedicated to Paul Gauguin" by Vincent van Gogh significant in art history?`,
        answer: `This self-portrait marks a pivotal moment in Van Gogh's artistic journey and his complex friendship with Paul Gauguin. Painted in September 1888, just before Gauguin arrived in Arles, Van Gogh deliberately portrayed himself as a Japanese Buddhist monk — shaved head, angular features, an almost ascetic appearance. The jade-green background functions like a halo, referencing the Japanese woodblock prints he was obsessed with at the time.

What makes this work historically significant is Van Gogh's radical departure from traditional portraiture. He eliminated shadows entirely, flattened the space, and used color symbolically rather than descriptively. This was his way of moving beyond Impressionism toward something more spiritual and emotionally direct.

The dedication to Gauguin adds another layer: Van Gogh saw artists as the new priests of modern society, and this gift was meant to show Gauguin his most serene, devoted self. Tragically, their time together in Arles would end in Van Gogh's breakdown just months later.`,
        followUps: [
          "Why did Van Gogh see himself as a Buddhist monk?",
          "How did Van Gogh's relationship with Gauguin influence his art?",
        ],
      },
      {
        question: `If I were standing in front of "Self-Portrait Dedicated to Paul Gauguin", what details should I look for first?`,
        answer: `Start with his eyes — they're the emotional anchor of this painting. Unlike many of his other self-portraits where anxiety radiates from his gaze, here Van Gogh looks directly at you with unusual calm. This was intentional; he wanted Gauguin to see him as a serene, dedicated artist.

Next, notice the complete absence of shadows on his face. This was radical for 1888. Traditional portraiture models the face with light and shadow to create depth, but Van Gogh flattened everything, using the jade-green background to suggest an almost sacred space around his head.

Look closely at his coat — the brushwork is thick and textured, almost sculptural. You can see the physical labor of painting in every stroke. Compare this to the smoother, more even treatment of his face.

Finally, step back and take in the color relationship: the orange-red of his beard against that jade green. These are complementary colors that vibrate against each other, creating visual energy that's impossible to capture in reproduction.`,
        followUps: [
          "What do the colors Van Gogh chose tell us about his emotional state?",
          "How does this portrait compare to Van Gogh's other self-portraits?",
        ],
      },
      // Follow-up answers for Van Gogh
      {
        question: "Why did Van Gogh see himself as a Buddhist monk?",
        answer: `Van Gogh's identification with Buddhist monks came from his deep engagement with Japanese art and culture. In the 1880s, Paris was flooded with Japanese woodblock prints, and Van Gogh collected hundreds of them, studying their flat colors, bold outlines, and spiritual simplicity.

He was particularly drawn to the idea of the artist as a spiritual seeker — someone who renounces worldly comforts in pursuit of truth and beauty. In his letters to his brother Theo, Van Gogh frequently compared the artist's life to a monk's devotion: both require sacrifice, discipline, and faith in something larger than oneself.

The shaved head in this portrait wasn't just a stylistic choice — Van Gogh had actually shaved his head that summer. Combined with his increasingly gaunt features from poor nutrition and overwork, he genuinely resembled the Buddhist monks he admired in Japanese prints.`,
        followUps: [
          "What Japanese artists influenced Van Gogh the most?",
          "Did Van Gogh practice any form of Buddhism?",
        ],
      },
      {
        question: "How did Van Gogh's relationship with Gauguin influence his art?",
        answer: `The Van Gogh-Gauguin relationship was one of the most intense and consequential in art history. Van Gogh idolized Gauguin and dreamed of establishing an artists' colony in Arles with him at the center. For months before Gauguin's arrival, Van Gogh painted frantically to decorate the Yellow House — the sunflower series was specifically created to impress his hero.

Gauguin's influence pushed Van Gogh toward more symbolic, less naturalistic color. Where Van Gogh had been painting what he saw, Gauguin encouraged him to paint what he felt — to use color as pure expression rather than description. The jade green in this portrait shows that influence.

But the relationship was also destructive. Gauguin was domineering; Van Gogh was needy. After nine weeks together, tensions exploded. Van Gogh's breakdown — the famous ear incident — ended the experiment. Yet the artistic exchange had permanently altered both painters' work.`,
        followUps: [
          "What happened during Van Gogh's breakdown in Arles?",
          "How did Gauguin's style differ from Van Gogh's?",
        ],
      },
      {
        question: "What do the colors Van Gogh chose tell us about his emotional state?",
        answer: `The jade green and orange color scheme in this portrait is remarkably harmonious for Van Gogh — and that's the point. He was deliberately presenting himself as calm, centered, and spiritually composed because he wanted Gauguin to see him that way.

Van Gogh understood color theory deeply and used it emotionally. He associated green with rest, recovery, and the infinite. In his letters, he wrote about green as "something of the eternal" — appropriate for the monk-like persona he was crafting.

The warmth of his orange beard against the cool green creates visual tension, but it's balanced tension. Compare this to his more anguished self-portraits where yellows clash against violets, or where agitated brushwork suggests inner turmoil. Here, the brushwork is relatively calm, the colors complementary but not aggressive.

Van Gogh painted what he wished to feel, not necessarily what he did feel. The serenity in this image was aspirational.`,
        followUps: [
          "What colors did Van Gogh associate with different emotions?",
          "How did Van Gogh learn color theory?",
        ],
      },
      {
        question: "How does this portrait compare to Van Gogh's other self-portraits?",
        answer: `Van Gogh painted over 30 self-portraits in just three years, and this one is uniquely peaceful among them. Most of his self-portraits show evident psychological tension — darting eyes, furrowed brows, anxious backgrounds.

Compare this to his self-portraits from Saint-Rémy asylum, painted after his breakdown: those show a Van Gogh wrestling with madness, using swirling backgrounds and tormented expressions. Or look at his Paris self-portraits, which are more experimental but also more unsettled.

This portrait stands out because Van Gogh was performing for an audience — specifically for Gauguin. He composed himself the way an actor might prepare for a role: the serene Buddhist monk, the devoted artist, the worthy colleague. The directness of his gaze is unusual — in most self-portraits he looks slightly away or his eyes dart with nervous energy.

It's one of the few self-portraits where Van Gogh seems at peace with himself, even if that peace was partly constructed for Gauguin's benefit.`,
        followUps: [
          "What happened after Van Gogh painted this portrait?",
          "Where are Van Gogh's other self-portraits located today?",
        ],
      },
    ],
  },
  {
    objectid: 228650,
    title: "Red Boats, Argenteuil",
    artist: "Claude Monet",
    answers: [
      {
        question: `What makes "Red Boats, Argenteuil" by Claude Monet significant in art history?`,
        answer: `This painting captures Monet at a crucial moment — the years at Argenteuil (1871-1878) when he was perfecting the techniques that would define Impressionism. He actually built a floating studio boat so he could paint the Seine from the water itself, capturing reflections from the very surface he was depicting.

The work is significant for how it demonstrates Monet's revolutionary approach to color and light. The red boats against the blue water isn't an accident — it's pure complementary color theory applied with scientific precision. Monet understood that placing opposites on the color wheel next to each other creates visual vibration, making both colors appear more intense.

Historically, this was painted just before the first Impressionist exhibition in 1874, when critics would mock the movement's "unfinished" look. But Monet knew exactly what he was doing — capturing the fleeting effects of sunlight on water in a way that felt more true to visual experience than any finished academic painting.`,
        followUps: [
          "What was Monet's floating studio boat like?",
          "How did critics respond to Impressionism when it first emerged?",
        ],
      },
      {
        question: `If I were standing in front of "Red Boats, Argenteuil", what details should I look for first?`,
        answer: `Begin with the water — this is where Monet's genius really shows. Notice how the brushstrokes in the water are strictly horizontal, while the sky uses softer, more diagonal marks. He's differentiating surfaces purely through the direction of his brush, not by blending or smoothing.

The red boats are positioned to draw your eye, but look at how they're rendered: loose, confident strokes that suggest the form without defining every detail. This economy of mark-making was revolutionary. Academic painters would have labored over every plank and rope.

Step closer and you'll see the reflections aren't simply copying the boats above — they're broken, shimmerering, catching the light differently. Monet painted what the eye actually sees, not what the mind knows to be there.

Finally, notice the horizon line and how it divides the composition. The sky is surprisingly small, pushing all that luminous water toward you. In reproduction, this painting looks peaceful. In person, the color relationships create an almost electric quality.`,
        followUps: [
          "Why did Monet choose to paint at Argenteuil specifically?",
          "How did Monet capture the effect of light on water?",
        ],
      },
      // Follow-up answers for Monet
      {
        question: "What was Monet's floating studio boat like?",
        answer: `Monet's floating studio was a small wooden boat with a cabin built on top — essentially a houseboat converted for painting. He could row it into position on the Seine, drop anchor, and paint while literally floating on the water he was depicting.

The boat had a small cabin to shelter him from weather and store his supplies, but most importantly, it gave him direct, unobstructed views of the water surface and its reflections. He could paint at water level rather than from the shore, which gave his water studies an intimacy and accuracy that painters working from land couldn't achieve.

Gustave Caillebotte, a fellow Impressionist and boat enthusiast, actually designed an improved version for Monet. The floating studio became famous — Édouard Manet even painted Monet working on it in 1874, showing the artist seated in his boat-studio with his wife Camille, brushes in hand, surrounded by the shimmering water he loved.`,
        followUps: [
          "Who was Gustave Caillebotte and how did he support the Impressionists?",
          "What other artists painted en plein air from boats?",
        ],
      },
      {
        question: "How did critics respond to Impressionism when it first emerged?",
        answer: `The critical response to early Impressionism was largely hostile. The term "Impressionism" itself came from a mocking review of the 1874 exhibition — critic Louis Leroy looked at Monet's "Impression, Sunrise" and wrote sarcastically, "Impression — I was certain of it... wallpaper in its embryonic state is more finished than that seascape."

Critics attacked the painters for their "unfinished" work, visible brushstrokes, and unconventional subjects. Academic painting valued smooth surfaces that hid all evidence of the brush, historical or mythological subjects, and dark studio lighting. The Impressionists rejected all of this.

They were also rejected by the official Salon, the annual state-sponsored exhibition that determined an artist's career. Being refused by the Salon meant no sales, no commissions, no recognition. The Impressionists responded by organizing their own exhibitions — eight between 1874 and 1886.

By the 1880s, attitudes began shifting. Dealers like Paul Durand-Ruel championed them, collectors emerged, and what was once mocked as unfinished became recognized as revolutionary.`,
        followUps: [
          "Who was the first collector to buy Impressionist paintings?",
          "Why did the Academy oppose Impressionism so strongly?",
        ],
      },
      {
        question: "Why did Monet choose to paint at Argenteuil specifically?",
        answer: `Argenteuil was ideal for Monet's purposes: close enough to Paris to access collectors and dealers, but rural enough to offer the landscapes and waterscapes he wanted to paint. The railway made the journey simple — he could reach Paris in fifteen minutes.

The town sat on the Seine, with sailing boats, bridges, factories, and gardens offering varied subjects. It was also becoming a leisure destination for Parisians, so Monet could paint modern life — people at play, regattas, promenades — the contemporary subjects that Impressionism championed.

Financially, it was practical. Living costs were lower than Paris, and the house he rented had a garden where he could paint flowers and family scenes. During his seven years there (1871-1878), Monet produced over 170 paintings — his most productive period.

Argenteuil also attracted other artists. Renoir, Sisley, and Manet all visited and painted there, sometimes working alongside Monet. It became an informal Impressionist colony, a place where the movement's ideas were developed and refined.`,
        followUps: [
          "What other Impressionists painted at Argenteuil?",
          "How did the railway change art in the 19th century?",
        ],
      },
      {
        question: "How did Monet capture the effect of light on water?",
        answer: `Monet's water effects came from careful observation and innovative technique. He understood that water doesn't have a single color — it reflects the sky, the banks, objects floating on it, and light from multiple angles simultaneously.

His technique was to use short, broken brushstrokes of different colors placed side by side. From a distance, the eye blends them; up close, you see distinct dabs of blue, green, white, pink, yellow. This optical mixing creates a shimmering effect that single mixed colors cannot achieve.

He also paid attention to brushstroke direction. For water, he used horizontal strokes that follow the surface; for reflections, he often used vertical or slightly angled marks that suggest the broken, wavering quality of reflected images.

Speed mattered too. Light on water changes constantly — within minutes, the whole scene can transform. Monet painted quickly, capturing a moment rather than generalizing. He often worked on multiple canvases simultaneously, switching between them as the light changed throughout the day.`,
        followUps: [
          "Why did Monet often paint the same scene multiple times?",
          "What materials and paints did Monet use?",
        ],
      },
    ],
  },
  {
    objectid: 229045,
    title: "Geraniums",
    artist: "Henri Matisse",
    answers: [
      {
        question: `What makes "Geraniums" by Henri Matisse significant in art history?`,
        answer: `This painting comes from Matisse's Fauve period (roughly 1904-1908), when he and a group of artists were deliberately using "wrong" colors to express emotion rather than describe reality. The name "Fauvism" means "wild beasts" — a term critics used mockingly, but which the artists embraced.

The significance of Geraniums lies in its bold color theory. Matisse studied complementary colors obsessively, and the clash of hot reds against jade greens here is no accident. He once said that an inch of the wrong blue can ruin an acre of red — he understood that colors exist in relationship, not isolation.

This work was painted in Collioure, a fishing village on the Mediterranean where the intense southern light pushed Matisse to use these saturated, seemingly impossible colors. What looks aggressive on first glance was meant to be soothing — Matisse famously said he wanted his art to be "like a good armchair" for the viewer's mind.`,
        followUps: [
          "What was Fauvism and who were the other Fauve artists?",
          "Why did Matisse say he wanted art to be like a comfortable armchair?",
        ],
      },
      {
        question: `If I were standing in front of "Geraniums", what details should I look for first?`,
        answer: `Start with the red — not just any red, but Matisse's particular cadmium red that almost vibrates against the green. In reproduction this looks bold; in person it's almost overwhelming. The red seems to advance toward you while the green recedes.

Notice the black outlines around the forms. Matisse borrowed this technique from stained glass windows, and it's no coincidence — he wanted his paintings to glow like light through colored glass. The outlines contain the color fields and intensify them.

Look at how the composition is flattened. There's very little sense of depth or traditional perspective. The geraniums, the pot, the background — everything exists on the same plane, like a medieval tapestry. This was Matisse rejecting Renaissance perspective in favor of decorative power.

Finally, examine the brushwork. It's confident, almost casual, with visible strokes that don't try to hide themselves. The "simplicity" is deceptive — Matisse often repainted his canvases dozens of times to achieve this sense of effortlessness.`,
        followUps: [
          "How did stained glass influence Matisse's painting style?",
          "What made the Mediterranean light in Collioure so special for artists?",
        ],
      },
      // Follow-up answers for Matisse
      {
        question: "What was Fauvism and who were the other Fauve artists?",
        answer: `Fauvism was a short-lived but explosive movement (roughly 1904-1908) where artists used intense, non-naturalistic colors to express emotion rather than describe reality. The name came from critic Louis Vauxcelles who, seeing their work at the 1905 Salon d'Automne, called them "les fauves" — the wild beasts.

Besides Matisse, the key Fauves included André Derain, Maurice de Vlaminck, Raoul Dufy, and Georges Braque (before he invented Cubism with Picasso). Each brought something different: Derain's colors were almost violent; Vlaminck painted with raw intensity straight from the tube; Dufy developed a more decorative approach.

What united them was the liberation of color from descriptive duty. A face could be green, a sky could be orange, shadows could be purple — if the emotional effect was right, realism didn't matter.

The movement was short because its intensity was hard to sustain. By 1908, most Fauves had moved on — Braque to Cubism, Matisse to his own increasingly refined style. But Fauvism permanently freed color from literal representation.`,
        followUps: [
          "Why did Fauvism only last a few years?",
          "What happened to the Fauvist artists after the movement ended?",
        ],
      },
      {
        question: "Why did Matisse say he wanted art to be like a comfortable armchair?",
        answer: `Matisse's famous armchair quote — that he wanted his art to be "like a comfortable armchair for a tired businessman" — sounds surprising given how radical his work appeared. But it reveals his deeper purpose: he wanted to soothe and restore, not disturb.

Matisse believed art should be a refuge from the complexity and anxiety of modern life. The bold colors that shocked critics were meant to create harmony, not discord. Think of how a room painted in strong colors can feel more restful than a beige room — the intensity becomes enveloping rather than aggressive.

He distinguished his approach from Expressionism, which used distortion and color to express anguish or social criticism. Matisse wasn't interested in making viewers uncomfortable or forcing them to confront difficult truths. He wanted to create visual pleasure that approached spiritual peace.

Later in life, when illness confined him to a wheelchair, he created his famous paper cutouts — works of pure, joyful color that fulfilled his armchair vision perhaps more completely than any painting.`,
        followUps: [
          "What are Matisse's paper cutouts and how did he make them?",
          "How did Matisse's approach differ from Expressionism?",
        ],
      },
      {
        question: "How did stained glass influence Matisse's painting style?",
        answer: `Matisse was fascinated by stained glass windows throughout his career, and their influence shows in several distinctive features of his work: the bold black outlines, the flat areas of saturated color, and the way his paintings seem to glow from within.

Medieval stained glass uses lead lines to separate color areas, creating a mosaic-like effect where each hue exists pure and unblended. Matisse borrowed this principle, using dark outlines to contain his colors and intensify them through contrast. Without blending or gradation, each color retains maximum intensity.

The luminosity of stained glass — light passing through colored glass rather than reflecting off pigment — was something Matisse tried to capture in paint. He understood that placing complementary colors next to each other creates visual vibration that mimics the glow of light through glass.

At the end of his life, Matisse literally designed stained glass for the Chapel of the Rosary in Vence, France. The project, which he called his masterpiece, brought his lifelong fascination full circle.`,
        followUps: [
          "What is the Chapel of the Rosary that Matisse designed?",
          "How do complementary colors create the effect of glowing light?",
        ],
      },
      {
        question: "What made the Mediterranean light in Collioure so special for artists?",
        answer: `The Mediterranean light in places like Collioure has qualities that northern European painters found revelatory: it's more intense, more direct, and casts harder shadows than the diffuse light of Paris or London. Objects appear more saturated, colors more vivid.

Collioure sits on the French-Spanish border where the Pyrenees meet the sea. The combination of water reflection, mountain backdrop, and southern latitude creates exceptional clarity. Matisse arrived there in summer 1905 and was overwhelmed — the light pushed him to abandon any remaining naturalism and embrace pure color.

The intensity forced a choice: either paint what you see (impossibly bright) or paint something believable (and lose the experience). Matisse chose to paint the intensity itself, using "wrong" colors that captured the feeling of that light better than accurate observation could.

Other artists made similar discoveries in similar climates: Van Gogh in Arles, Picasso on the Costa Brava, Gauguin in Tahiti. The Mediterranean became an incubator for color experimentation because its light demanded new solutions.`,
        followUps: [
          "What other artists painted in the south of France?",
          "How did different geographic locations influence art movements?",
        ],
      },
    ],
  },
  {
    objectid: 227646,
    title: "Mural",
    artist: "Joan Miró",
    answers: [
      {
        question: `What makes "Mural" by Joan Miró significant in art history?`,
        answer: `This mural was painted in 1935, during one of the most turbulent periods in Spanish history — the lead-up to the Spanish Civil War. While Miró never explained his work politically, the aggressive forms and clashing colors here carry an urgency that his earlier, more playful works don't have.

Miró's significance lies in his process: he described painting "as if in a trance," staring at a blank canvas until shapes appeared to him spontaneously. This wasn't Surrealism's deliberate dream imagery, but something more primal — visual instinct without intellectual interference.

The biomorphic forms — those amoeba-like shapes with teeth and eyes — became Miró's signature. He anthropomorphized everything, believing all forms had life and personality. The scale of this mural matters too: on paper these forms would look playful, almost cute. But at mural size, they feel urgent, overwhelming, perhaps threatening.`,
        followUps: [
          "How did the Spanish Civil War affect Miró's art?",
          "What's the difference between Miró's approach and Surrealism?",
        ],
      },
      {
        question: `If I were standing in front of "Mural", what details should I look for first?`,
        answer: `Start by stepping back — this work needs distance to read as a whole. The composition is organized chaos, with forms that seem to push against each other like creatures in a too-small space.

Now move closer and look for the eyes and teeth. Miró gave nearly every shape some anthropomorphic feature. These aren't random — they transform abstract forms into beings with personality and intention. Some feel playful, others aggressive.

Notice the colors: primary reds, yellows, and blues against black and white. Miró limited his palette deliberately, using color to create rhythm and emphasis rather than to describe anything real. The black lines work like calligraphy, defining forms with a brushwork that feels both spontaneous and controlled.

Finally, look for the negative space — the areas where the background shows through. Miró understood that what you don't paint matters as much as what you do. The breathing room between forms is what keeps this composition from becoming claustrophobic.`,
        followUps: [
          "Why did Miró paint forms with eyes and teeth?",
          "How did Miró's background in Catalan art influence his style?",
        ],
      },
      // Follow-up answers for Miró
      {
        question: "How did the Spanish Civil War affect Miró's art?",
        answer: `The Spanish Civil War (1936-1939) transformed Miró's work from playful to anguished. His most famous political painting, "Still Life with Old Shoe" (1937), abandoned his usual bright colors for a palette of sickness and decay — browns, greens, and blacks suggesting rot and destruction.

That same year, he created "The Reaper" for the Spanish Republican pavilion at the Paris World's Fair, displayed alongside Picasso's "Guernica." Both artists were responding to fascist bombing of civilians. The Reaper was a giant figure with a sickle — the Catalan peasant as symbol of resistance.

Even in his more abstract work, the war years brought darker colors, more violent forms, sharper teeth and claws on his biomorphic creatures. The playfulness never entirely disappeared, but it became edged with menace.

After Franco's victory, Miró went into internal exile on Mallorca. He continued working but refused to engage with Franco's regime, becoming a quiet symbol of Catalan cultural resistance until his death in 1983.`,
        followUps: [
          "What happened to Miró's 'The Reaper' painting?",
          "How did other artists respond to the Spanish Civil War?",
        ],
      },
      {
        question: "What's the difference between Miró's approach and Surrealism?",
        answer: `While Miró exhibited with the Surrealists and was close friends with André Breton (Surrealism's founder), his approach differed fundamentally. The Surrealists used specific techniques — automatic writing, dream journals, Freudian analysis — to access the unconscious and then represent those findings in art.

Miró bypassed representation entirely. He didn't try to depict dreams or unconscious content; he tried to paint from an unconscious state. He would stare at blank canvases until shapes "demanded" to exist, then paint without intellectual intervention. The results weren't symbols to be decoded but direct expressions of primal creative energy.

The Surrealists, especially Dalí, created images that could be analyzed: melting clocks mean something, the burning giraffes symbolize something else. Miró's forms resist this kind of reading. What does an amoeba with teeth "mean"? The question feels wrong to ask.

Miró also rejected Surrealism's urban sophistication. He remained connected to Catalan peasant culture, to the land and the Mediterranean, drawing on folk art traditions that the Paris Surrealists had no access to.`,
        followUps: [
          "Who were the main Surrealist artists?",
          "What techniques did the Surrealists use to access the unconscious?",
        ],
      },
      {
        question: "Why did Miró paint forms with eyes and teeth?",
        answer: `Miró's anthropomorphic forms — abstract shapes given eyes, teeth, limbs — reflect his belief that everything possesses a kind of life or spirit. A rock, a star, a blob of paint — all have presence and personality if you look at them correctly.

The eyes are crucial because they create relationship. Once a form has eyes, it can look at you — it becomes a being, not just a shape. Miró understood this primitive psychology: humans are wired to find faces, to see consciousness in paired dots.

The teeth add ambiguity. Are these creatures friendly or threatening? The smile with teeth can be welcoming or menacing. This tension keeps the forms alive, prevents them from becoming merely decorative.

Miró was also drawing on Catalan folk art traditions — the grotesque figures in carnival celebrations, the monsters in Romanesque church paintings. These weren't high art references but childhood memories, absorbed before he learned to think critically about them.`,
        followUps: [
          "What is Catalan folk art and how did it influence Miró?",
          "Why are humans so quick to see faces in abstract forms?",
        ],
      },
      {
        question: "How did Miró's background in Catalan art influence his style?",
        answer: `Catalonia, the region of northeastern Spain where Barcelona is located, has a distinct artistic heritage that shaped Miró profoundly. Romanesque church frescoes, with their flat colors and bold outlines, are everywhere in Catalonia — Miró grew up seeing them.

The Catalan Modernisme movement (related to Art Nouveau) was also formative. Antoni Gaudí's organic architecture, with its rejection of straight lines and embrace of natural forms, anticipated Miró's biomorphic shapes.

Catalan folk culture — the "sardana" dance, carnival "gegants" (giant figures), the "castells" (human towers) — emphasized community, ritual, and a kind of cosmic connection to land and sea. Miró absorbed this worldview: art as celebration, as connection to something larger than the individual.

Even his palette connects to Catalonia: the blues of the Mediterranean, the earth tones of the countryside, the bright colors of fishing boats and festival costumes. Miró remained rooted in this landscape even when working in the most avant-garde Parisian circles.`,
        followUps: [
          "What is Catalan Modernisme and how does it relate to Art Nouveau?",
          "How did Miró's Catalan identity affect his relationship with Paris?",
        ],
      },
    ],
  },
  {
    objectid: 299931,
    title: "No. 2",
    artist: "Jackson Pollock",
    answers: [
      {
        question: `What makes "No. 2" by Jackson Pollock significant in art history?`,
        answer: `This 1950 painting comes from Pollock's most celebrated period, when he had fully developed his "drip" technique. He worked with the canvas laid flat on the floor, moving around it, dripping and flinging paint with sticks and hardened brushes. The canvas became a record of his entire body's movement, not just his hand.

Pollock called this "action painting" — the painting wasn't a picture of something but evidence of an event. This shifted the question from "what does it represent?" to "what did the artist do?" It was revolutionary and controversial.

The materials matter too: Pollock used industrial enamel and aluminum paints, not traditional artist oils. This was a deliberate rejection of what galleries considered "proper" materials. The drips and splatters couldn't be fully controlled, but Pollock had remarkable skill in guiding them — he could stop a drip mid-motion when he needed to.`,
        followUps: [
          "How did Pollock develop his drip painting technique?",
          "What did critics say about Pollock's work when it first appeared?",
        ],
      },
      {
        question: `If I were standing in front of "No. 2", what details should I look for first?`,
        answer: `First, let yourself feel disoriented. This is intentional — Pollock removed the focal point, the horizon line, any traditional way of organizing what you're seeing. Let your eye wander without trying to "read" the painting.

Now look at the layers. Pollock didn't drip everything at once — he let each layer dry before adding the next, creating depth that you can only really see from the side or at an angle. The black aluminum sits on top of earlier colors, creating a web-like structure.

Move close enough to see individual drips and splatters. Some are thick ropes of paint, others are fine sprays. This variation came from how Pollock moved — fast versus slow, arm versus wrist, close to the canvas versus standing back.

Finally, try to imagine the canvas on the floor with Pollock moving around it. This wasn't painted from one position — he attacked it from all four sides. There's no "right side up" in the traditional sense, which is why the title is just a number, not a description.`,
        followUps: [
          "Why did Pollock paint on the floor instead of an easel?",
          "What does it mean to experience a Pollock painting versus just looking at one?",
        ],
      },
      // Follow-up answers for Pollock
      {
        question: "How did Pollock develop his drip painting technique?",
        answer: `Pollock's drip technique emerged gradually through the mid-1940s. He had studied with Thomas Hart Benton (a Regionalist), worked on WPA murals during the Depression, and absorbed influences from Picasso, the Mexican muralists, and Navajo sand painting.

The breakthrough came when he moved to a farmhouse in Springs, Long Island in 1945. The barn became his studio, and its large floor space allowed him to work on canvases too big for easels. He began laying canvas on the floor and discovered that he could control paint in new ways by moving around the surface.

By 1947, he had abandoned brushes entirely for sticks and hardened brushes, dripping and flinging paint in continuous motion. He wasn't throwing paint randomly — he developed extraordinary control, able to vary the thickness, trajectory, and layering with precision.

The technique was also psychological: it eliminated the barrier between artist and canvas. There was no easel separating him from the work. He could be in the painting, as he famously said, rather than working on it.`,
        followUps: [
          "What is Navajo sand painting and how did it influence Pollock?",
          "Who was Thomas Hart Benton and why did Pollock study with him?",
        ],
      },
      {
        question: "What did critics say about Pollock's work when it first appeared?",
        answer: `Critical response to Pollock was explosive and divided. Life magazine ran a famous headline in 1949: "Is he the greatest living painter in the United States?" — which managed to be both publicity and skepticism in one question.

The supportive critics, led by Clement Greenberg, saw Pollock as the logical conclusion of modernist painting — the complete elimination of representation, the painting as pure object rather than window onto something else. Greenberg called Pollock the most important American painter of the century.

The hostile critics saw chaos, fraud, and the death of skill. "Could my kid do that?" became a cliché. Time magazine nicknamed him "Jack the Dripper." The public often laughed at abstract expressionism, unable to see craft in what looked like accident.

What both sides agreed on was that Pollock had changed the conversation. Whether you loved or hated the work, you had to reckon with it. The question of what painting could be had been permanently expanded.`,
        followUps: [
          "Who was Clement Greenberg and why was his opinion so influential?",
          "How did abstract expressionism change the art world?",
        ],
      },
      {
        question: "Why did Pollock paint on the floor instead of an easel?",
        answer: `The floor changed everything about how Pollock could work. On an easel, you stand in one position, moving your arm. On the floor, you can move your whole body — stepping, reaching, circling the canvas. The painting becomes a record of choreography, not just hand movements.

The floor also allowed gravity to work differently. Paint dripped downward regardless of Pollock's position around the canvas, creating a different relationship between gesture and mark than brushwork on a vertical surface.

Psychologically, working on the floor put Pollock inside the painting's space rather than confronting it from outside. He described feeling able to "walk around in it, work from the four sides and literally be in the painting." The canvas became an arena rather than a surface.

There was also a practical reason: the large scale Pollock wanted couldn't fit on any easel. But the technique determined the scale as much as scale determined the technique — they evolved together.`,
        followUps: [
          "How big are Pollock's largest paintings?",
          "Did other artists adopt floor painting after Pollock?",
        ],
      },
      {
        question: "What does it mean to experience a Pollock painting versus just looking at one?",
        answer: `Reproductions of Pollock are almost useless. In a book or on a screen, you see a pattern — interesting, maybe, but static and containable. In person, the paintings are overwhelming in a physical sense.

Scale matters enormously. Standing before a large Pollock, the painting extends beyond your peripheral vision. You can't take it in at once; your eye has to move through it, following drips and splatters, getting lost, finding new paths. It's more like being in a space than looking at an object.

The layering also only reads in person. What looks like a flat web on screen reveals itself as depth — some drips over others, some colors beneath, a three-dimensional archaeology of marks. The physical texture of pooled and dripped paint creates shadows and variations that photography flattens.

Time matters too. You need to stand with a Pollock, letting your nervous initial scan settle into slower attention. The painting teaches you how to look at it, which takes minutes, not seconds.`,
        followUps: [
          "Where can I see Pollock's paintings in person?",
          "How should I approach looking at abstract art in museums?",
        ],
      },
    ],
  },
  {
    objectid: 232342,
    title: "Flight",
    artist: "David Smith",
    answers: [
      {
        question: `What makes "Flight" by David Smith significant in art history?`,
        answer: `David Smith was a welder before he became an artist, and he borrowed industrial metalworking techniques to create sculpture that breathed like drawing in three dimensions. Flight, made in 1951, represents a revolutionary approach: sculpture that's mostly air, with steel lines suggesting movement and form rather than occupying solid mass.

Traditional sculpture up to this point was about volume — Rodin, Michelangelo, even Brancusi worked with solid forms. Smith made sculpture you could almost see through, where the negative space carries as much weight as the steel itself.

The rust on the surface isn't decay — Smith celebrated the oxidation process as natural aging, more honest than the artificial patinas applied to bronze. He wanted his work to exist in time, changing and weathering rather than pretending to be permanent.`,
        followUps: [
          "How did Smith's background as a welder influence his art?",
          "What other sculptors were working in similar ways in the 1950s?",
        ],
      },
      {
        question: `If I were standing in front of "Flight", what details should I look for first?`,
        answer: `Start by walking around it. Smith conceived his sculptures as four-sided paintings — every angle offers a complete composition, not just a different view of the same thing. What looks like a bird from one side might become pure abstraction from another.

Notice how the steel elements suggest motion without actually moving. The title "Flight" isn't literal — it's about the feeling of weightlessness, of something heavy becoming light. Look at where the forms seem to lift or thrust upward.

Examine the negative space — the air between the steel lines. This isn't just background; it's as carefully composed as the metal itself. Smith understood that what you leave out defines what you put in.

Finally, look at the surface: the rust, the weld marks, the texture of industrial steel. Smith didn't polish or prettify his materials. The honesty of the medium is part of the meaning. This is sculpture that admits what it's made of.`,
        followUps: [
          "Why did Smith title this work 'Flight'?",
          "How does Smith's sculpture relate to Abstract Expressionist painting?",
        ],
      },
      // Follow-up answers for David Smith
      {
        question: "How did Smith's background as a welder influence his art?",
        answer: `Smith worked as a welder in an automobile factory and later at a locomotive works before becoming an artist. This wasn't just technical training — it shaped his entire aesthetic. He understood steel as a living material with its own properties and possibilities.

Where traditional sculptors carved or modeled, adding or subtracting from a mass, Smith assembled. He thought in terms of joining separate elements, building outward from connections rather than releasing forms from blocks. The weld seam, which classical sculpture would hide, became part of his visual vocabulary.

Industrial tools also gave him speed. Bronze casting requires molds, waiting, finishing. Steel welding is immediate — you think, you cut, you join. Smith could work almost as spontaneously as the Action Painters he knew, improvising compositions in real-time.

The factory aesthetic mattered philosophically too. Smith rejected the pretension that art required noble materials like marble or bronze. Steel was honest, democratic, modern — the material of bridges and skyscrapers, made artistic through vision rather than preciousness.`,
        followUps: [
          "What is the difference between welding, casting, and carving in sculpture?",
          "Were there other industrial artists working alongside Smith?",
        ],
      },
      {
        question: "What other sculptors were working in similar ways in the 1950s?",
        answer: `Smith was part of a generation that reinvented sculpture after World War II. His peers included Alexander Calder, whose mobiles achieved weightlessness through actual movement; Theodore Roszak, who used welding for more organic, tortured forms; and Ibram Lassaw, who created cosmic, web-like structures.

In Europe, sculptors like Eduardo Chillida in Spain and Anthony Caro in Britain were developing parallel approaches — open forms, industrial materials, the embrace of negative space. Caro, in fact, came to America specifically to study with Smith.

What united these artists was a rejection of the solid monument. Traditional public sculpture was massive, heroic, occupying space through sheer presence. The new sculpture occupied space through gesture, line, and implied movement. It engaged the viewer's imagination rather than simply commanding attention.

The critic Clement Greenberg championed Smith as the three-dimensional equivalent of Pollock — both were removing representation, both were making art about its own process, both were expanding what their medium could do.`,
        followUps: [
          "Who was Alexander Calder and how did his mobiles work?",
          "How did European sculpture differ from American in the 1950s?",
        ],
      },
      {
        question: "Why did Smith title this work 'Flight'?",
        answer: `Smith's titles were often evocative rather than descriptive. "Flight" suggests the feeling the sculpture creates — a sense of lifting, of escaping gravity — rather than depicting anything that actually flies.

The steel elements do seem to thrust upward and outward, defying their material weight. What should feel heavy and grounded instead feels dynamic, even airborne. This tension between the literal heaviness of steel and its visual lightness is central to Smith's achievement.

Smith worked in thematic series. The "Flight" works explored how linear elements could suggest movement through space. Other series included "Tanktotem" (vertical totemic figures), "Zig" (angular, aggressive forms), and "Cubi" (geometric stainless steel). Each series investigated a different formal problem.

The generic title also reflects Smith's resistance to narrative. He didn't want viewers to see a bird or a plane — he wanted them to feel the sensation of flight itself, abstracted from any particular flying thing.`,
        followUps: [
          "What other series did David Smith create?",
          "How do artists decide on titles for abstract work?",
        ],
      },
      {
        question: "How does Smith's sculpture relate to Abstract Expressionist painting?",
        answer: `Smith was close friends with the Abstract Expressionist painters — Pollock, de Kooning, Motherwell — and saw himself as part of the same movement. His studio in Bolton Landing, New York, was a gathering place for the downtown art world.

The relationship was formal as well as social. Smith conceived his sculptures as "drawings in space," using steel lines the way painters used brushstrokes. Like the AbEx painters, he worked spontaneously, making compositional decisions in real-time rather than from preparatory sketches.

His sculptures also shared the scale ambitions of the painters. Just as Pollock's canvases filled the viewer's field of vision, Smith's larger works created environmental presence. You didn't just look at them — you moved around them, experienced them bodily.

The emphasis on gesture connected them too. Each weld mark, each cut, each angle recorded Smith's physical decision in the moment. Like Action Painting, the sculpture was evidence of an event, not just a finished object.`,
        followUps: [
          "What is Abstract Expressionism and who were its key figures?",
          "How did scale become important in postwar American art?",
        ],
      },
    ],
  },
  {
    objectid: 228358,
    title: "Bamboo through the Four Seasons",
    artist: "Yoo Tok Chang",
    answers: [
      {
        question: `What makes "Bamboo through the Four Seasons" by Yoo Tok Chang significant in art history?`,
        answer: `This eight-panel screen represents a masterwork of Korean literati painting from the mid-18th century. Yoo Tok Chang studied under the great masters of ink painting, working in a tradition where bamboo wasn't just a subject but a spiritual practice — each stroke was meant to express the artist's inner cultivation.

The significance lies in how Yoo captured all four seasons not chronologically but philosophically. The bamboo moves from spring's fresh growth through summer's fullness, autumn's maturity, and winter's sparse elegance. But these aren't separate paintings — they flow together, suggesting that all states of being exist simultaneously.

In East Asian art, bamboo symbolizes integrity and resilience — it bends but doesn't break. By painting it through all seasons, Yoo was expressing both continuity and change, permanence within transformation. This is literati painting at its most refined: not commercial decoration but scholarly meditation made visible.`,
        followUps: [
          "What is literati painting and who practiced it?",
          "Why is bamboo such an important symbol in East Asian art?",
        ],
      },
      {
        question: `If I were standing in front of "Bamboo through the Four Seasons", what details should I look for first?`,
        answer: `Begin with the brushwork, which is the soul of this painting. Notice how each stroke is visible — there's no blending, no correction. In ink painting, the brush must be right the first time. The confidence you see took decades to develop.

Watch how the brushwork changes across the seasons. Spring bamboo is painted with wet, bold strokes suggesting fresh growth. By winter, the brush is almost dry, leaving ghostly marks that evoke cold and dormancy. This progression is technically masterful.

Look at what's not painted. The unpainted areas of the paper aren't background — they're integral to the composition. In East Asian aesthetics, emptiness is as significant as form. The breathing space around the bamboo is what gives it life.

Finally, step back and take in all eight panels as one continuous rhythm. The artist composed this as a single meditation, meant to be experienced as you walk past it, with each panel flowing into the next.`,
        followUps: [
          "How long would it take to master this style of ink painting?",
          "What does the empty space in the painting represent?",
        ],
      },
      // Follow-up answers for Yoo Tok Chang
      {
        question: "What is literati painting and who practiced it?",
        answer: `Literati painting (wenren hua in Chinese, muninhwa in Korean) was practiced by scholar-officials — educated men who served in government and saw painting not as a profession but as a form of self-cultivation. Unlike professional court painters, literati painted for personal expression and to share with friends, not for sale or commission.

The tradition emerged in China during the Song dynasty (960-1279) and spread to Korea and Japan. Key Chinese masters included Su Shi, Mi Fu, and the "Four Masters of the Yuan." In Korea, the tradition flourished during the Joseon dynasty, with Yoo Tok Chang representing its mature refinement.

Literati painters deliberately avoided the technical virtuosity of professional painters. Their work aimed to express inner character, not outer skill. A simple bamboo could reveal more about the artist's cultivation than a complex landscape.

The subjects themselves were symbolic: bamboo (integrity), plum blossoms (perseverance), orchids (purity), and chrysanthemums (scholarly retirement). These "Four Gentlemen" became the primary subjects because their meanings aligned with scholarly virtues.`,
        followUps: [
          "What are the 'Four Gentlemen' in East Asian painting?",
          "How did literati painting differ from court painting?",
        ],
      },
      {
        question: "Why is bamboo such an important symbol in East Asian art?",
        answer: `Bamboo carries profound symbolic meaning across East Asian cultures. It bends in storms but doesn't break, representing resilience and flexibility. Its hollow interior symbolizes humility and openness to wisdom. Its evergreen leaves represent constancy through changing seasons.

For scholars, bamboo embodied the ideal character: upright but not rigid, strong but not aggressive, growing continuously toward higher goals. Painting bamboo became a form of moral self-cultivation — the discipline required to master the brushwork mirrored the discipline required to cultivate virtue.

Technically, bamboo is both simple and impossibly difficult. Its few elements — stalk, node, branch, leaf — must be painted with confident, singular strokes. There's nowhere to hide uncertainty. Each stroke reveals the painter's state of mind, their years of practice, their character.

Generations of literati developed precise techniques for each element. The stalk uses a specific brush hold; the leaves require different pressures and speeds. A lifetime could be spent mastering this single subject.`,
        followUps: [
          "How do artists paint bamboo leaves with single brushstrokes?",
          "What other plants have symbolic meaning in East Asian art?",
        ],
      },
      {
        question: "How long would it take to master this style of ink painting?",
        answer: `Traditional literati painters often said it took twenty years just to hold the brush correctly. This wasn't false modesty — ink painting requires a kind of neuromuscular mastery that can't be rushed.

The brush must become an extension of the arm, then the body, then the breath. Each stroke is made in one continuous movement, with no correction possible. The ink is permanent; hesitation shows. Confidence must be earned through tens of thousands of practice strokes.

In traditional education, a student would copy masters for years before attempting original work. They would grind their own ink, studying its consistency and flow. They would practice single strokes — the bone of the bamboo stalk, the flesh of the leaf — until each could be executed without thought.

Yoo Tok Chang would have begun training in childhood, studying with established masters, copying classical models, and only gradually developing personal expression within the tradition. The apparent spontaneity of his brushwork represents decades of disciplined practice.`,
        followUps: [
          "How do artists prepare ink for traditional painting?",
          "What was the traditional education system for Korean painters?",
        ],
      },
      {
        question: "What does the empty space in the painting represent?",
        answer: `In East Asian aesthetics, empty space is not absence but presence. The unpainted areas of the paper are as carefully composed as the painted elements. This concept, sometimes called "ma" in Japanese or "yeobaek" in Korean, treats emptiness as a positive element.

The white space around the bamboo suggests atmosphere, air, light — the environment in which the bamboo exists. It also creates visual breathing room, allowing the eye to rest and the forms to resonate.

Philosophically, the empty space connects to Buddhist and Daoist ideas about the relationship between being and non-being. The Daoist classic Tao Te Ching notes that a wheel's usefulness lies in its empty hub, a vessel's usefulness in its hollow interior. Similarly, a painting's power often comes from what it doesn't show.

In practical terms, the empty space amplifies the impact of each stroke. A single bamboo stalk surrounded by vast whiteness carries more weight than the same stalk crowded with detail. The restraint itself becomes expressive.`,
        followUps: [
          "What is the concept of 'ma' or negative space in Asian art?",
          "How does Daoist philosophy relate to East Asian painting?",
        ],
      },
    ],
  },
  {
    objectid: 228649,
    title: "Dance at Bougival",
    artist: "Pierre-Auguste Renoir",
    answers: [
      {
        question: `What makes "Dance at Bougival" by Pierre-Auguste Renoir significant in art history?`,
        answer: `Painted in 1883, this is one of three large dance paintings Renoir created that year, each with different models representing different social classes. Dance at Bougival captures middle-class leisure — not an aristocratic ball but a public dance hall where ordinary people went to enjoy themselves.

The female model is Suzanne Valadon, who would later become a significant artist herself. She modeled for Renoir, Toulouse-Lautrec, and Degas while secretly studying their techniques, eventually becoming one of the few successful female painters of her era.

This painting marks Renoir's transition away from pure Impressionism. Notice the solid forms and clear outlines — he was beginning to question whether the movement's emphasis on light and atmosphere came at the cost of structure. He'd soon enter his "dry" or "Ingres" period, pursuing more classical forms.`,
        followUps: [
          "Who was Suzanne Valadon and what art did she create?",
          "Why did Renoir move away from Impressionism?",
        ],
      },
      {
        question: `If I were standing in front of "Dance at Bougival", what details should I look for first?`,
        answer: `Start with her red bonnet — it's not just a compositional focal point but a social marker. Red bonnets were associated with working-class women at the time. Renoir was celebrating ordinary people having joy, not just painting pretty pictures of the wealthy.

Notice how the background is intentionally blurred while the couple is sharp. Renoir was mimicking how our eyes actually work — when we focus on someone, everything else goes soft. This selective focus was revolutionary and more psychologically true than academic precision.

Look at the way his hand holds her waist and her hand rests on his shoulder. These aren't posed — they feel like captured moments. The motion of the dance is frozen mid-step, her dress still swirling.

Finally, feel the warmth. Renoir's palette here is dominated by warm colors — the yellows, oranges, and that red bonnet against a cooler blue-green background. This color temperature makes the couple seem to radiate light and life.`,
        followUps: [
          "What was Bougival like in the 1880s?",
          "How did Renoir capture the sense of movement in the dance?",
        ],
      },
      // Follow-up answers for Renoir
      {
        question: "Who was Suzanne Valadon and what art did she create?",
        answer: `Suzanne Valadon had one of the most remarkable stories in art history. Born illegitimate, she worked as a circus acrobat until a fall ended that career at 15. She became an artist's model, posing for Renoir, Toulouse-Lautrec, Puvis de Chavannes, and Degas.

While modeling, she taught herself to draw, secretly studying the techniques of the masters she posed for. Degas discovered her talent and became her mentor, the only formal training she received. He encouraged her to exhibit, and by her late twenties she was showing alongside established artists.

Her paintings are remarkable for their directness, especially her nudes. Where male painters idealized or eroticized the female body, Valadon painted women as they actually looked — solid, imperfect, present. She was one of the first women admitted to the Société Nationale des Beaux-Arts.

Her son, Maurice Utrillo, also became a famous painter. She taught him to paint as therapy for his alcoholism, and mother and son both became fixtures of the Montmartre art world.`,
        followUps: [
          "How did Valadon's paintings of women differ from male artists' work?",
          "Who was Maurice Utrillo and what did he paint?",
        ],
      },
      {
        question: "Why did Renoir move away from Impressionism?",
        answer: `By the early 1880s, Renoir felt he had "wrung Impressionism dry." The emphasis on capturing fleeting light effects left him dissatisfied — he felt his figures were dissolving, losing solidity and drawing.

A trip to Italy in 1881-82 was decisive. Seeing Raphael's frescoes and Pompeian paintings, Renoir realized he wanted to return to classical form. He began what critics call his "Ingres Period" or "Dry Period" — paintings with harder outlines, cooler colors, more deliberate drawing.

This transition shows in "Dance at Bougival." The couple is still painterly, but the forms are more solid than pure Impressionism would allow. Renoir was finding a middle path between the formlessness he feared and the academic stiffness he rejected.

Later, he moved into his final "pearly" period, synthesizing Impressionist color with classical form. He continued painting until his death in 1919, even when arthritis forced brushes to be strapped to his hands.`,
        followUps: [
          "What is the 'Ingres Period' in Renoir's work?",
          "How did Renoir paint with arthritis in his final years?",
        ],
      },
      {
        question: "What was Bougival like in the 1880s?",
        answer: `Bougival was a village on the Seine, west of Paris, that became a favorite leisure destination for Parisians in the late 19th century. The railway made it easily accessible — you could leave the city, dance and dine by the river, and return the same evening.

The Bal des Canotiers (Boatmen's Ball) was its most famous attraction — an open-air dance hall where the bourgeoisie and working class mixed in ways impossible in Paris. Young clerks, seamstresses, artists, and students danced together, creating a atmosphere of social and romantic possibility.

The Impressionists loved Bougival and nearby spots like Argenteuil and Chatou. The Seine offered boats, reflections, and leisure scenes; the mixed crowds offered human interest. Renoir painted some of his most joyful works there, including "Luncheon of the Boating Party."

This world would soon fade. By the 1900s, the character had changed, becoming more touristy and less authentic. Renoir's paintings preserve a moment when spontaneous pleasure felt possible — before modernization homogenized everything.`,
        followUps: [
          "What is 'Luncheon of the Boating Party' and who's in it?",
          "Why did the Impressionists paint so many leisure scenes?",
        ],
      },
      {
        question: "How did Renoir capture the sense of movement in the dance?",
        answer: `Renoir used several techniques to suggest motion in what is, after all, a frozen image. The most obvious is her dress — the fabric swirls outward, caught mid-spin. The diagonal sweep of white creates a visual rhythm that pulls the eye around the composition.

Their bodies lean into the movement. He looks down at her, she tilts her head, their arms are caught in specific positions that feel momentary rather than posed. Academic painters would have shown idealized positions; Renoir captured an instant.

The blur serves motion too. The background figures and setting are deliberately soft, as if speed made them indistinct. Only the couple is sharp, the way motion makes its center feel stable while the surroundings rush by.

Color also plays a role. The warm tones of the couple contrast with the cooler background, pushing them forward in space. This three-dimensionality enhances the sense that they're actually moving through the dance hall, not standing before a painted backdrop.`,
        followUps: [
          "How did other artists capture movement in painting?",
          "What dances were popular in 1880s Paris?",
        ],
      },
    ],
  },
  {
    objectid: 228710,
    title: "The Fog Warning",
    artist: "Winslow Homer",
    answers: [
      {
        question: `What makes "The Fog Warning" by Winslow Homer significant in art history?`,
        answer: `Painted in 1885, The Fog Warning represents Homer at his most powerful — a painter who left behind his earlier commercial illustration work to confront the fundamental drama of humans against nature. Homer spent summers in Gloucester, Massachusetts, watching Grand Banks fishermen, understanding their world before he painted it.

The significance lies in its psychological intensity. This isn't just a maritime scene — it's an existential crisis captured in paint. The fisherman has caught enough halibut to fill his dory, but now he faces the real challenge: getting back to the schooner before the fog swallows him. That barely-visible ship on the horizon is his only lifeline.

Homer lived alone in Maine for his final decades, painting the sea obsessively. The isolation shows in his late work — there's an existential weight that his earlier, more social paintings lack. The Fog Warning asks questions about fate, labor, and survival that feel timeless.`,
        followUps: [
          "What was life like for Grand Banks fishermen?",
          "Why did Homer move to Maine and live alone?",
        ],
      },
      {
        question: `If I were standing in front of "The Fog Warning", what details should I look for first?`,
        answer: `Start with the horizon — notice how it tilts. Homer placed us in another boat on the same swelling sea. We're not safely on shore looking at this scene; we're out there with him, equally unstable. This immediately creates empathy and tension.

Look at the fisherman's face and posture. He's looking back over his shoulder toward the schooner, calculating distance and time. His oars are raised, caught mid-stroke. Homer has frozen the moment of decision: can he make it back?

The halibut in the bottom of the boat tells an economic story. This is a successful catch — but success means nothing if he can't return. Homer understood that fishing was both livelihood and gamble.

Finally, examine how Homer painted the fog itself — that gray wall advancing from the right. It's not just weather; it's death approaching. The contrast between the warm light on the fisherman and the cold gray of the fog creates the painting's emotional power.`,
        followUps: [
          "How dangerous was Grand Banks fishing in the 1880s?",
          "What techniques did Homer use to create the sense of fog?",
        ],
      },
      // Follow-up answers for Homer
      {
        question: "Why did Homer live such an isolated life in Maine?",
        answer: `Homer's choice to live alone in Prouts Neck, Maine, was deliberate and defining. After establishing his reputation in New York and Boston, he retreated to near-hermitage to focus on his art and his dialogue with the sea.

He built a studio directly on the ocean, where he could observe light, weather, and waves in all conditions. Visitors reported he was gruff, private, and fiercely protective of his time. When admirers asked for paintings, he often refused or quoted prices so high they assumed he was joking.

This isolation was partly temperament but also strategy. Away from the New York art world's pressures and politics, Homer worked on his own terms. The Adirondacks and the sea provided subjects of inexhaustible complexity — the play of light on water, the psychology of labor, the confrontation between man and nature.

By the time he died in 1910, Homer was recognized as America's greatest painter, but on his terms: a recluse who had transcended the need for approval.`,
        followUps: [
          "What did Homer paint besides the sea?",
          "Why was Homer's isolation unusual for an artist of his stature?",
        ],
      },
      {
        question: "How dangerous was Grand Banks fishing in the 1880s?",
        answer: `Grand Banks fishing was extraordinarily dangerous. The waters off Newfoundland were cold, stormy, and far from rescue. Dories — small boats like the one in this painting — could be swamped in minutes. Fog could descend unexpectedly, disorienting fishermen and separating them from their mother ships.

Many fishermen drowned annually. The catch had to be magnificent to justify the risk. Halibut were one of the most valuable catches — enough money in a single successful haul to support a family for months. But that prosperity was always conditional on return.

Homer painted this world with unflinching realism. The contemporary artist Childe Hassam criticized Homer for making art "look like real work," but that was precisely the point. Homer refused to romanticize labor or downplay its dangers for the sake of aesthetic pleasure.

The Grand Banks economy collapsed in the 1890s as fish stocks declined, but Homer had already documented its last golden era. His paintings are now the primary visual record of that world.`,
        followUps: [
          "What happened to the Grand Banks fishing industry?",
          "How did other artists depict labor differently from Homer?",
        ],
      },
      {
        question: "What techniques did Homer use to create the sense of fog?",
        answer: `Homer's fog is a masterpiece of restraint and psychology. Rather than painting fog as a romantic haze, he painted it as an oncoming threat — a solid gray wall advancing across the composition.

He used limited color: warm ochres and reds on the fisherman and boat, then a rapid transition into cool grays and blues as the fog approaches. This color shift alone creates the sense of encroaching cold.

The brushwork also shifts. The foreground is detailed and precise — every rope, every pleat of the man's shirt is visible. The middle distance becomes looser, hazier. The fog itself is almost empty, painted with dry brush that suggests obscurity and danger.

Compositionally, Homer used scale. The fisherman is small against the vast fog and empty sea. This scale imbalance heightens our sense of human vulnerability. We feel the vastness closing in.`,
        followUps: [
          "How did Homer use color symbolically in his seascapes?",
          "What other artists were contemporaries of Homer in 19th-century America?",
        ],
      },
    ],
  },
  {
    objectid: 228681,
    title: "The Daughters of Edward Darley Boit",
    artist: "John Singer Sargent",
    answers: [
      {
        question: `What makes "The Daughters of Edward Darley Boit" by John Singer Sargent significant in art history?`,
        answer: `Painted in 1882 when Sargent was just 26, this work announced a major talent willing to break rules. The asymmetrical composition, the vast dark negative space, the informal poses — critics called it unfinished, but Sargent knew exactly what he was doing.

The painting is a direct response to Velázquez's Las Meninas, which Sargent had studied obsessively. Like Velázquez, he created a psychological portrait disguised as a group scene, using space and light to suggest inner states rather than just outer appearances.

The four Boit daughters are arranged from youngest to oldest, from full light to deep shadow. Art historians have noted that none of the sisters ever married, and some speculate that Sargent sensed something melancholic about their future. The youngest girl, fully lit and facing us, will recede into shadow as she ages — it's a painting about innocence and its loss.`,
        followUps: [
          "What is Velázquez's Las Meninas and why was it important to Sargent?",
          "What happened to the Boit daughters later in life?",
        ],
      },
      {
        question: `If I were standing in front of "The Daughters of Edward Darley Boit", what details should I look for first?`,
        answer: `Start with the youngest daughter in the foreground — she's the only one fully lit and fully facing us. Her doll lies beside her, she's seated on the floor, and there's an openness to her posture that the older sisters don't share.

Now look at how the older girls progressively retreat into shadow. One stands in the middle distance, half-turned away. The two eldest are nearly swallowed by the dark doorway, their faces hard to read. This progression from light to shadow mirrors the journey from childhood to adulthood.

Notice the enormous Japanese vases — they're real objects from the Boit household, about five feet tall. Sargent used their scale to make the older girls seem small, contained by family wealth and expectation.

Finally, feel the silence. Despite showing four children, this isn't a lively or playful scene. The vast empty space, the dark corners, the stillness of the poses — it feels like a memory, or a premonition, more than a snapshot.`,
        followUps: [
          "Why did Sargent include so much empty dark space?",
          "How does the painting change as the girls get older?",
        ],
      },
      // Follow-up answers for Sargent
      {
        question: "What was Sargent's relationship with Velázquez's Las Meninas?",
        answer: `Sargent was obsessed with Las Meninas, arguably the greatest painting in Western art. He studied it, copied parts of it, and made a pilgrimage to see it in Madrid multiple times. It was his north star for understanding how to paint psychology through composition.

Like Velázquez, Sargent created ambiguity and psychological depth through spatial arrangement. In Las Meninas, the princess seems small and central despite being surrounded by attendants; Velázquez himself is painting in the background. Where is the focus? The painting refuses a single answer.

Sargent applied this lesson to The Daughters. The viewer isn't sure whether to look at the youngest girl (most prominent) or the older, more mysterious figures receding into shadow. The Japanese vases don't belong to the daughters — they contain the space. Just as Velázquez used objects and space to create psychological complexity, Sargent did too.

This homage reveals something important: Sargent saw himself not as a society portrait painter but as a serious artist grappling with the deepest problems of representation.`,
        followUps: [
          "What other painters were influenced by Velázquez?",
          "How did Sargent's approach to portraiture differ from other society painters?",
        ],
      },
      {
        question: "Why did Sargent include so much empty dark space?",
        answer: `The darkness isn't a mistake or an unfinished background. It's a deliberate choice that creates the painting's power. The empty space suggests these girls exist in a kind of psychological isolation, even gathered together.

The darkness also emphasizes light. The youngest girl's face and dress are brilliantly lit; this contrast makes her presence electric. The older girls fade into shadow, which older art historians read as the loss of youth's glow — innocence receding.

The composition makes the vases more ominous. They emerge from the darkness like monuments or tombstones. Rather than celebrating the family's wealth, they seem to cage or contain the children.

This approach was radical. Academic portraiture would have filled the background with status symbols — furniture, landscape, architectural details. Sargent's emptiness is psychologically probing rather than decorative.`,
        followUps: [
          "What other artists used emptiness and darkness symbolically?",
          "How do modern viewers interpret Sargent's darkness differently from his contemporaries?",
        ],
      },
      {
        question: "How does the painting change as the girls get older?",
        answer: `The progression is unmissable once you notice it: left to right, top to bottom, the girls move from light into shadow, from full visibility into obscurity.

The youngest, positioned lowest and most forward, is caught in what feels like a spotlight. Her pale dress, her relative openness and directness to the viewer — she occupies a position of privilege and exposure.

As you follow the composition upward and backward, the older sisters become harder to read. Their features are less distinct. Their postures are stiffer, more formal. The one in back seems almost to disappear into shadow.

This can be read as a meditation on aging — the brightness of youth fading into the dimness of adulthood and responsibility. But it's also technically brilliant. Sargent shows us that portraiture isn't just about capturing a likeness; it's about exploring states of being. The youngest sister is "there" in a way the older ones are not.`,
        followUps: [
          "What other artworks show the passage of time within a single image?",
          "How did Sargent respond to criticism of this painting?",
        ],
      },
      {
        question: "What happened to the Boit daughters later in life?",
        answer: `This is where the melancholy deepens. Historical records show that none of the four Boit daughters ever married. In their era, particularly for women of their social standing, this was unusual and often meant a life of limited agency.

The youngest, Mary Louisa, died relatively young. The others lived longer but apparently led quiet, unremarkable lives. They remained in their father's household or visited relatives, but there's little record of significant accomplishments or autonomous lives.

Some art historians speculate that Sargent, by temperament and training sensitive to psychological undercurrents, somehow sensed this bleak future and captured it in the painting. The darkness may not be prophetic but rather empathetic — his intuitive understanding of the constraints these girls faced.

The painting haunts us because we know what the girls became: not, perhaps, unhappy, but certainly circumscribed — contained by the expectations and limitations of their era, much like the vases contain the space.`,
        followUps: [
          "What were the typical life options for wealthy women in the 1880s?",
          "Have art historians found primary sources from the Boit family?",
        ],
      },
    ],
  },
  {
    objectid: 229050,
    title: "Madame Cézanne in a Red Armchair",
    artist: "Paul Cézanne",
    answers: [
      {
        question: `What makes "Madame Cézanne in a Red Armchair" by Paul Cézanne significant in art history?`,
        answer: `Cézanne painted his wife Hortense over 40 times, more than any other subject, yet never painted her smiling. Their marriage was difficult — she wanted Parisian society, he wanted Aix-en-Provence solitude. But these tensions produced some of the most important portraits in modern art.

The significance lies in how Cézanne was dismantling traditional perspective. Notice how the chair seems to tilt forward while Hortense's body tilts back. This isn't incompetence — he was deliberately showing multiple viewpoints simultaneously, decades before Picasso would name it Cubism.

Cézanne painted slowly, sometimes leaving canvases for months before returning. Hortense had to sit perfectly still for hundreds of hours. The patience required was extraordinary, but the result was a new way of seeing: forms reduced to their essential geometry, reality rebuilt from basic shapes.`,
        followUps: [
          "Why did Cézanne paint Hortense so many times?",
          "How did Cézanne influence Picasso and Cubism?",
        ],
      },
      {
        question: `If I were standing in front of "Madame Cézanne in a Red Armchair", what details should I look for first?`,
        answer: `Start with her expression — stoic, unreadable, almost mask-like. Cézanne wasn't interested in psychology the way Sargent was. He was treating Hortense's face as a formal problem: planes, angles, the relationship of shapes.

Look at the red armchair: it's as much a subject as Hortense herself. Cézanne was obsessed with how objects exist in space, and the chair creates a frame within the frame. Notice how the red seems to push forward while the muted greens and blues of her dress recede.

Examine the brushwork — it's deliberate, almost architectural. Each stroke is placed with intention, building form the way a mason builds a wall. There's none of Impressionism's flicker; C��zanne wanted solidity, permanence.

Finally, look for the geometry. Her face is simplified into planes. The chair is reduced to essential curves. Even the background is organized into color blocks. Cézanne was finding the cylinder, sphere, and cone in everything — his famous formula for understanding nature.`,
        followUps: [
          "What did Cézanne mean by finding the cylinder, sphere, and cone?",
          "Why are the colors in this portrait so muted compared to other artists?",
        ],
      },
      // Follow-up answers for Cézanne
      {
        question: "Why did Cézanne paint Hortense so many times?",
        answer: `Hortense's face was an inexhaustible problem for C��zanne. She represented a challenge: how to reduce a human face to its essential geometry while maintaining its presence as a living, breathing being.

Each portrait tackled the problem differently. In some versions, her face is almost mask-like; in others, more naturalistic. Some show her looking at us; others have her gaze averted. Cézanne was experimenting, iterating, trying to find the solution to representing form and structure.

There was also a domestic reason: she was there. Hortense was the convenient model, available for endless sittings. Their difficult marriage meant she understood his obsessive methods and tolerated the long hours required.

Finally, there's the romantic explanation: beneath the artist's theoretical project was a man grappling with ambivalence about the woman he'd married. The repeated paintings suggest an attempt to understand her, to find the truth of her character beneath surfaces.`,
        followUps: [
          "How many Hortense portraits did Cézanne actually paint?",
          "What happened to Cézanne and Hortense's relationship over time?",
        ],
      },
      {
        question: "How did Cézanne influence Picasso and Cubism?",
        answer: `Cézanne was the bridge between traditional painting and modernism. When Picasso saw Cézanne's work, he recognized that representation didn't require realistic rendering. Objects could be shown from multiple viewpoints; perspective could be fractured; form could be abstracted.

The Cubist principle of showing an object from many viewpoints simultaneously was directly inspired by Cézanne's tilted tables, fractured space, and multiple perspectives. Picasso and Braque both acknowledged Cézanne as the father of modern painting.

Cézanne's statement about "treating nature by the cylinder, the sphere, the cone" became Cubism's theoretical foundation. If all objects reduce to basic geometric forms, then those forms are the primary subject, not the illusion of appearance.

What Cézanne began as formal exploration, Cubism developed into a systematic language for modern art. He died in 1906, and by 1909, Cubism was in full bloom, but Cézanne had provided the philosophical and artistic foundation.`,
        followUps: [
          "What is the Cubist movement and who were its key figures?",
          "How did other art movements respond to Cézanne's innovations?",
        ],
      },
      {
        question: "What did Cézanne mean by finding the cylinder, sphere, and cone?",
        answer: `This famous dictum — that all objects in nature reduce to cylinders, spheres, and cones — was Cézanne's attempt to systematize how we see. He wasn't literal; he wasn't saying every object is geometrically pure. Rather, he meant that underlying the appearance of any thing are basic geometric forms.

A tree trunk is a cylinder; an apple is a sphere; a mountain is a cone. By thinking in these terms, the artist gains control over representation. Instead of copying surfaces, you're organizing form.

This was radical because it shifted painting from representation to structure. The goal wasn't to capture likeness but to reveal the underlying architecture of things. It's a philosophical position: beneath the chaos of appearance lies geometric order.

Cézanne practiced this relentlessly. His still lifes are arrangements of geometric forms. His faces are built from planes and angles. His landscapes are organized into interlocking shapes. The method sounds dry, but the results are full of life — the geometry doesn't diminish vitality; it clarifies it.`,
        followUps: [
          "How did Cézanne's geometric approach differ from Renaissance perspective?",
          "What other artists have used geometric principles in abstract ways?",
        ],
      },
      {
        question: "Why are the colors in this portrait so muted compared to other artists?",
        answer: `Cézanne's palette here is deliberately restrained — warm ochres, muted reds, soft grays, and blues. This is very different from the intense colors the Impressionists used, or even from his own earlier work.

He was making a choice: color should serve structure, not vice versa. Bright, intense colors can distract from form; they can flatten the painting into decoration. Cézanne wanted form to emerge through color modulation, the way light and shadow build three-dimensionality.

The muted palette also connects to his engagement with the Old Masters. Looking at paintings by Venetian artists and Poussin, Cézanne learned that restraint could carry more power than extravagance. A small shift in value, a subtle color relationship, conveys more than a shout.

There's also philosophical content: Hortense, sitting in her red armchair, is not a jewel to admire but a presence to understand. The muted colors reflect her stoic, enduring quality — not decoration but presence.`,
        followUps: [
          "How did Cézanne's color use evolve over his lifetime?",
          "Why was Cézanne interested in Venetian and Classical painters?",
        ],
      },
    ],
  },
]

/**
 * Hard-coded scripted conversation branches for specific artworks.
 * These play automatically without LLM calls, guiding users through
 * curated narrative experiences designed to deepen art appreciation.
 */
export const SCRIPTED_BRANCHES: ScriptedBranch[] = [
  {
    triggerId: `If I were standing in front of "Self-Portrait Dedicated to Paul Gauguin", what details should I look for first?`,
    objectid: 299843,
    steps: [
      {
        response: `Start with his eyes — they're the emotional anchor of this painting. Unlike many of his other self-portraits where anxiety radiates from his gaze, here Van Gogh looks directly at you with unusual calm. This was intentional; he wanted Gauguin to see him as a serene, dedicated artist.`,
        nextPrompt: `[Prefix: Observational] Looking deeper into that serene expression... What is he thinking? What is he staring at?`,
      },
      {
        response: `[Prefix: Empathy] That's a poignant observation. Their relationship was indeed intense and fragile. What is he worried about?`,
        nextPrompt: `Continue...`,
      },
      {
        response: `[Prefix: Curiosity] That's a sharp insight into their artistic tension. I'm curious about your perspective... How did you come up with that idea?`,
        nextPrompt: `One more thought...`,
      },
      {
        response: `[Prefix: Connection] It's incredible how much emotion he could pack into a single gaze. If you could step beyond the frame and reach out to him... If you are in this portrait, how do you want to interact with him?`,
      },
    ],
  },
]

/**
 * Look up a scripted branch by the trigger question and artwork ID.
 */
export function getScriptedBranch(
  question: string,
  objectid: number,
): ScriptedBranch | null {
  const normalized = question.toLowerCase().trim()
  return (
    SCRIPTED_BRANCHES.find(
      (b) =>
        b.objectid === objectid &&
        b.triggerId.toLowerCase().trim() === normalized,
    ) ?? null
  )
}
export function getArtworkDefaults(objectid: number): ArtworkDefaults | null {
  return ARTWORK_DEFAULT_ANSWERS.find((a) => a.objectid === objectid) ?? null
}

/**
 * Given a question string, find the matching default answer if it exists.
 * Returns the answer and follow-ups, or null if no match.
 */
export function findDefaultAnswer(
  question: string,
  objectid: number
): { answer: string; followUps: [string, string] } | null {
  const defaults = getArtworkDefaults(objectid)
  if (!defaults) return null
  
  // Normalize for comparison
  const normalizedQuestion = question.toLowerCase().trim()
  
  for (const qa of defaults.answers) {
    if (qa.question.toLowerCase().trim() === normalizedQuestion) {
      return { answer: qa.answer, followUps: qa.followUps }
    }
  }
  
  return null
}
