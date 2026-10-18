export interface DonationConfig {
  kofi: {
    url: string;
    displayUrl: string;
  };
  pakistan: {
    bankName: string;
    accountTitle: string;
    iban: string;
    ibanFormatted: string;
    raastId?: string;
  };
}

export const DONATION_CONFIG: DonationConfig = {
  kofi: {
    url: "https://ko-fi.com/harry",
    displayUrl: "ko-fi.com/harry",
  },
  pakistan: {
    bankName: "Meezan Bank",
    accountTitle: "Muhammad Haris",
    iban: "PK00MEZN0000000000000000",
    ibanFormatted: "PK00 MEZN 0000 0000 0000 0000",
    raastId: "03001234567",
  },
};
