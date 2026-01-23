#!/bin/bash

# Script d'impression pour imprimante DNP DS620
# Usage: ./print_photo.sh <photo> [template] [copies]

PHOTO_PATH="$1"
TEMPLATE_PATH="$2"
COPIES="${3:-1}"

# Vérifier la photo
if [ -z "$PHOTO_PATH" ] || [ ! -f "$PHOTO_PATH" ]; then
    echo "Erreur: photo introuvable ou non spécifiée"
    exit 1
fi

# Si le 2e argument est un nombre, pas un template
if [[ "$TEMPLATE_PATH" =~ ^[1-3]$ ]]; then
    COPIES="$TEMPLATE_PATH"
    TEMPLATE_PATH=""
fi

# Vérifier le template si fourni
if [ -n "$TEMPLATE_PATH" ] && [ ! -f "$TEMPLATE_PATH" ]; then
    echo "Erreur: template introuvable: $TEMPLATE_PATH"
    exit 1
fi

# Vérifier le nombre de copies
if ! [[ "$COPIES" =~ ^[1-3]$ ]]; then
    echo "Erreur: nombre de copies invalide (1–3 autorisé)"
    exit 1
fi

# Paramètres DNP DS620
PRINTER="DS620"
MEDIA="w288h432"
RESOLUTION="300x600dpi"
COLOR_PRECISION="Best"
COLOR_CORRECTION="Accurate"
BRIGHTNESS="1500"
CONTRAST="1100"
SATURATION="1100"
LAMINATE="Glossy"
IMAGE_TYPE="Photo"
COLOR_MODEL="RGB"

# Fichier temporaire pour impression
TMP_PRINT="/tmp/print_ds620_$(date +%s).png"

# Si template fourni → composite avec convert
if [ -n "$TEMPLATE_PATH" ]; then
    echo "Application du template..."
    sudo convert "$PHOTO_PATH" -resize 1800x1200^ -gravity center -crop 1800x1200+0+0 +repage \
        "$TEMPLATE_PATH" -resize 1800x1200! -composite "$TMP_PRINT"
    
    if [ $? -ne 0 ]; then
        echo "Erreur lors de la composition de l'image"
        exit 1
    fi
    
    # Donner les droits au fichier temporaire
    sudo chmod 644 "$TMP_PRINT"
else
    TMP_PRINT="$PHOTO_PATH"
fi

# Construire la commande lp
LP_CMD="lp -d $PRINTER"
LP_CMD="$LP_CMD -o media=$MEDIA"
LP_CMD="$LP_CMD -o Resolution=$RESOLUTION"
LP_CMD="$LP_CMD -o StpColorPrecision=$COLOR_PRECISION"
LP_CMD="$LP_CMD -o StpColorCorrection=$COLOR_CORRECTION"
LP_CMD="$LP_CMD -o StpBrightness=$BRIGHTNESS"
LP_CMD="$LP_CMD -o StpContrast=$CONTRAST"
LP_CMD="$LP_CMD -o StpSaturation=$SATURATION"
LP_CMD="$LP_CMD -o StpLamimate=$LAMINATE"
LP_CMD="$LP_CMD -o StpImageType=$IMAGE_TYPE"
LP_CMD="$LP_CMD -o ColorModel=$COLOR_MODEL"

# Impression
for i in $(seq 1 "$COPIES"); do
    echo "Impression $i/$COPIES..."
    $LP_CMD "$TMP_PRINT"
    if [ $? -ne 0 ]; then
        echo "Erreur lors de l'impression"
        exit 1
    fi
    [ "$i" -lt "$COPIES" ] && sleep 1
done

# Nettoyage
if [[ "$TMP_PRINT" == /tmp/print_ds620_* ]]; then
    sudo rm -f "$TMP_PRINT"
fi

echo "✅ Impression terminée avec succès"
exit 0