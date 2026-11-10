const brandLogos: Record<string, string> = {
  opel: "/images/brands/opel.svg",
  peugeot: "/images/brands/peugeot.svg",
  citroen: "/images/brands/citroen-2022.svg",
  chevrolet: "/images/brands/chevrolet.png",
  mg: "/images/brands/mg.svg",
};

export function vehicleBrandLogo(brand?: string) {
  return brand ? brandLogos[brand] : undefined;
}
