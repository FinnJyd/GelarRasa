"""User-approved logger assumptions: particulate mass scale and gas ppmv at 25 C/1 atm."""
APPROVED_LOGGERS = frozenset({'AQMS-BJB-01', 'AQMS-MDN-01', 'AQMS-PSW-01'})
GAS_MOLAR_MASS = {'so2': 64.066, 'co': 28.010, 'o3': 48.000, 'no2': 46.006}
GAS_MOLAR_VOLUME = 24.45
LOGGER_NORMALIZATION = {
    'policy': 'logger-mass-scale-and-gas-reference-v2',
    'stations': sorted(APPROVED_LOGGERS),
    'pollutants': ['pm25', 'pm10'],
    'factor': 1000,
    'assumption': 'For these three stations only, particulate *_ppm values are interpreted as mg/m3 logger mass concentrations and multiplied by 1000 to ug/m3. Gas *_ppm values are assumed ppmv and converted at 25 C and 1 atm using molecular mass / 24.45 * 1000. These are user-approved analytical assumptions, not committee-confirmed logger settings.',
    'gas_reference': {
        'temperature_c': 25, 'pressure_atm': 1, 'molar_volume_l_mol': GAS_MOLAR_VOLUME,
        'molar_mass_g_mol': GAS_MOLAR_MASS,
        'factors_to_ug_m3': {gas: mass / GAS_MOLAR_VOLUME * 1000 for gas, mass in GAS_MOLAR_MASS.items()},
        'assumption': 'Fixed reference conditions; do not substitute weather temperature or infer unrecorded ambient pressure.',
    },
    'references': [
        'https://metone.com/wp-content/uploads/2019/04/bam-1020-9803_touch_screen_manual_rev_k.pdf',
        'https://documents.thermofisher.com/TFS-Assets/CAD/Specification-Sheets/D00882.pdf',
        'https://www.ccohs.ca/oshanswers/chemicals/convert.html',
        'https://old.ecotech.com/wp-content/uploads/2021/12/M010028-Serinus-40-NOx-User-Manual-3.5.pdf',
    ],
}


def concentration_column(site, pollutant, columns):
    standard = f'{pollutant}_ug_m3'
    if standard in columns and site[f'{pollutant}_unit'] == 'ug/m3':
        return standard, 1.0
    logger = f'{pollutant}_ppm'
    if (site['station_code'] in APPROVED_LOGGERS
            and site[f'{pollutant}_unit'] == 'ppm' and logger in columns):
        if pollutant in ('pm25', 'pm10'):
            return logger, 1000.0
        if pollutant in GAS_MOLAR_MASS:
            return logger, GAS_MOLAR_MASS[pollutant] / GAS_MOLAR_VOLUME * 1000
    return None
