// Convert amount to Indian numbering system words
export function amountToWords(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  let rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let result = "";

  // Process crores
  if (rupees >= 10000000) {
    const crores = Math.floor(rupees / 10000000);
    result += convertTwoDigit(crores, ones, teens, tens) + " Crore ";
    rupees %= 10000000;
  }

  // Process lakhs
  if (rupees >= 100000) {
    const lakhs = Math.floor(rupees / 100000);
    result += convertTwoDigit(lakhs, ones, teens, tens) + " Lakh ";
    rupees %= 100000;
  }

  // Process thousands
  if (rupees >= 1000) {
    const thousands = Math.floor(rupees / 1000);
    result += convertTwoDigit(thousands, ones, teens, tens) + " Thousand ";
    rupees %= 1000;
  }

  // Process hundreds
  if (rupees >= 100) {
    const hundreds = Math.floor(rupees / 100);
    result += ones[hundreds] + " Hundred ";
    rupees %= 100;
  }

  // Process remaining
  if (rupees > 0) {
    result += convertTwoDigit(rupees, ones, teens, tens) + " ";
  }

  result += "Rupees";

  if (paise > 0) {
    result += " and " + paise + " Paise";
  }

  return result.trim() + " Only";
}

function convertTwoDigit(
  num: number,
  ones: string[],
  teens: string[],
  tens: string[]
): string {
  if (num === 0) return "";
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + ones[num % 10] : "");
}
