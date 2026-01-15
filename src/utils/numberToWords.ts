/**
 * Convert a number to French words
 * Example: 3200000 -> "Trois millions deux cent mille"
 */
export function numberToFrenchWords(num: number): string {
  const ones = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'
  ];

  const tens = [
    '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'
  ];

  if (num === 0) return 'zéro';

  function convertHundreds(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const one = n % 10;
      if (ten === 7 || ten === 9) {
        // Soixante-dix, quatre-vingt-dix
        const base = ten === 7 ? 'soixante' : 'quatre-vingt';
        if (one === 0) return base + (ten === 9 ? '-dix' : '');
        return base + '-' + ones[10 + one];
      }
      if (one === 0) {
        return tens[ten] + (ten === 8 ? 's' : '');
      }
      if (one === 1 && ten !== 8) {
        return tens[ten] + '-et-un';
      }
      return tens[ten] + '-' + ones[one];
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    let result = '';
    if (hundred === 1) {
      result = 'cent';
    } else {
      result = ones[hundred] + ' cent' + (hundred > 1 && remainder === 0 ? 's' : '');
    }
    if (remainder > 0) {
      result += ' ' + convertHundreds(remainder);
    }
    return result;
  }

  function convertThousands(n: number): string {
    if (n < 1000) return convertHundreds(n);
    const thousand = Math.floor(n / 1000);
    const remainder = n % 1000;
    let result = '';
    if (thousand === 1) {
      result = 'mille';
    } else {
      result = convertHundreds(thousand) + ' mille';
    }
    if (remainder > 0) {
      result += ' ' + convertHundreds(remainder);
    }
    return result;
  }

  function convertMillions(n: number): string {
    if (n < 1000000) return convertThousands(n);
    const million = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    let result = '';
    if (million === 1) {
      result = 'un million';
    } else {
      result = convertHundreds(million) + ' millions';
    }
    if (remainder > 0) {
      result += ' ' + convertThousands(remainder);
    }
    return result;
  }

  const result = convertMillions(num);
  return result.charAt(0).toUpperCase() + result.slice(1);
}

