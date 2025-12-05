export const formatName = (name: string): string => {
    return name.replace(/([A-Z])/g, ' $1').trim();
};
