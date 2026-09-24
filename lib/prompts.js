import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

/**
 * Tenký interaktivní průvodce. Používá se jen tehdy, když chybí argumenty
 * a běží interaktivní terminál.
 */
export function createPrompt() {
  const rl = readline.createInterface({ input, output });

  async function ask(question) {
    return (await rl.question(question)).trim();
  }

  return {
    async text(question, defaultValue) {
      const suffix = defaultValue ? ` [${defaultValue}]` : '';
      const answer = await ask(`${question}${suffix}: `);
      return answer || defaultValue;
    },

    async select(question, options, defaultId) {
      output.write(`\n${question}\n`);
      options.forEach((option, index) => {
        const mark = option.id === defaultId ? ' (výchozí)' : '';
        output.write(`  ${index + 1}) ${option.label}${mark}\n`);
      });

      const fallbackIndex = Math.max(
        0,
        options.findIndex((option) => option.id === defaultId),
      );

      const answer = await ask(`Vyber 1-${options.length} [${fallbackIndex + 1}]: `);
      if (!answer) return options[fallbackIndex].id;

      const index = Number.parseInt(answer, 10) - 1;
      if (Number.isNaN(index) || index < 0 || index >= options.length) {
        output.write('Neplatná volba, používám výchozí.\n');
        return options[fallbackIndex].id;
      }

      return options[index].id;
    },

    async multiSelect(question, options, defaultIds) {
      output.write(`\n${question}\n`);
      options.forEach((option, index) => {
        const mark = defaultIds.includes(option.id) ? ' *' : '';
        output.write(`  ${index + 1}) ${option.label}${mark}\n`);
      });
      output.write('  (čísla oddělená čárkou, "all" = vše, Enter = výchozí)\n');

      const fallbackIndexes = options
        .map((option, index) => (defaultIds.includes(option.id) ? index + 1 : null))
        .filter((value) => value !== null);

      const answer = await ask(`Vyber [${fallbackIndexes.join(',')}]: `);
      if (!answer) return [...defaultIds];
      if (answer.toLowerCase() === 'all') return options.map((option) => option.id);

      const selected = answer
        .split(/[,\s]+/)
        .map((value) => Number.parseInt(value, 10) - 1)
        .filter((index) => !Number.isNaN(index) && index >= 0 && index < options.length)
        .map((index) => options[index].id);

      return selected.length > 0 ? [...new Set(selected)] : [...defaultIds];
    },

    async confirm(question, defaultValue) {
      const suffix = defaultValue ? ' [Y/n]' : ' [y/N]';
      const answer = (await ask(`${question}${suffix}: `)).toLowerCase();

      if (!answer) return defaultValue;
      return answer === 'y' || answer === 'yes' || answer === 'a' || answer === 'ano';
    },

    close() {
      rl.close();
    },
  };
}
