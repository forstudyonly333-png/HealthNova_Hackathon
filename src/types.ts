export interface Doctor {
  id: string;
  name: string;
  qualifications: string;
  specialization: string;
  organization: string;
  image: string;
  rating: number;
  experienceYears: number;
  availability: string;
}

export interface ContactFormData {
  name: string;
  mobile: string;
  address: string;
  issue: string;
  query: string;
  uploadedFileName?: string;
}

export type ActiveNav = 'home' | 'doctors' | 'solutions' | 'contact' | 'about';
