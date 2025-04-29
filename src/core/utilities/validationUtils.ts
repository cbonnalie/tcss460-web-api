/**
 * Checks the parameter to see if it is a a String.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a String0, false otherwise
 */
function isString(candidate: any): candidate is string {
    return typeof candidate === 'string';
}

/**
 * Checks the parameter to see if it is a a String with a length greater than 0.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a String with a length greater than 0, false otherwise
 */
function isStringProvided(candidate: any): boolean {
    return isString(candidate) && candidate.length > 0;
}

/**
 * Checks the parameter to see if it can be converted into a number.
 *
 * @param {any} candidate the value to check
 * @returns true if the parameter is a number, false otherwise
 */
function isNumberProvided(candidate: any): boolean {
    return (
        isNumber(candidate) ||
        (candidate != null &&
            candidate != '' &&
            !isNaN(Number(candidate.toString())))
    );
}

/**
 * Helper
 * @param x data value to check the type of
 * @returns true if the type of x is a number, false otherise
 */
function isNumber(x: any): x is number {
    return typeof x === 'number';
}

function checkParams(param: string, value: any): boolean {
    if (param === 'isbn13') {
        return isNumberProvided(value) && String(value).length === 13;
    }
    if (param === 'publication_year') {
        return isNumberProvided(value) && value > 0;
    }
    return isStringProvided(value);
}

export const validParams = [
    'isbn13',
    'authors',
    'publication_year',
    'original_title',
    'title',
]

const isValidParam = (param: string): boolean => {
    return validParams.includes(param);
}

const validationFunctions = {
    isStringProvided,
    isNumberProvided,
    checkParams,
    isValidParam,
};

export { validationFunctions };
