import { servicesConfig } from "./config";

export const getPic = (name: string) => `${servicesConfig.avatars}/20/${name.toLowerCase()}.png`